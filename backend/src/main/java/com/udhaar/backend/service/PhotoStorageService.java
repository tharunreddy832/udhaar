package com.udhaar.backend.service;

import com.udhaar.backend.exception.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Arrays;
import java.util.UUID;

@Service
@Slf4j
public class PhotoStorageService {

    public static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    @Value("${udhaar.storage.photo-dir:${user.home}/.udhaar/photos}")
    private String photoDirProperty;

    private Path storagePath;

    @PostConstruct
    public void init() {
        try {
            this.storagePath = Paths.get(photoDirProperty).toAbsolutePath().normalize();
            if (!Files.exists(storagePath)) {
                Files.createDirectories(storagePath);
                log.info("Created customer photo storage directory at: {}", storagePath);
            } else {
                log.info("Customer photo storage directory initialized at: {}", storagePath);
            }
        } catch (IOException e) {
            log.error("Failed to initialize photo storage directory: {}", e.getMessage(), e);
            throw new RuntimeException("Could not initialize photo storage directory", e);
        }
    }

    public static class PhotoData {
        private final byte[] bytes;
        private final MediaType mediaType;

        public PhotoData(byte[] bytes, MediaType mediaType) {
            this.bytes = bytes;
            this.mediaType = mediaType;
        }

        public byte[] getBytes() {
            return bytes;
        }

        public MediaType getMediaType() {
            return mediaType;
        }
    }

    /**
     * Validates and stores a customer photo, returning the generated safe photoKey.
     */
    public String storePhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Photo file cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Photo file size exceeds maximum limit of 5 MB");
        }

        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("Invalid content type for photo");
        }
        contentType = contentType.toLowerCase().trim();

        String extension;
        if (contentType.equals("image/jpeg") || contentType.equals("image/jpg")) {
            extension = "jpg";
        } else if (contentType.equals("image/png")) {
            extension = "png";
        } else if (contentType.equals("image/webp")) {
            extension = "webp";
        } else {
            throw new IllegalArgumentException("Unsupported image format. Allowed formats: JPEG, PNG, WebP");
        }

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read image bytes", e);
        }

        validateRasterImage(fileBytes, extension);

        String safeFileName = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path targetPath = storagePath.resolve(safeFileName).normalize();

        // Path traversal defense
        if (!targetPath.startsWith(storagePath)) {
            throw new SecurityException("Invalid target file path (path traversal detected)");
        }

        try {
            Files.write(targetPath, fileBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Saved customer photo: {} ({} bytes)", safeFileName, fileBytes.length);
            return safeFileName;
        } catch (IOException e) {
            log.error("Failed to write photo file to disk: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to store photo file on server", e);
        }
    }

    /**
     * Loads a photo file by its relative safe key.
     */
    public PhotoData loadPhoto(String photoKey) {
        if (photoKey == null || photoKey.trim().isEmpty()) {
            throw new ResourceNotFoundException("Customer does not have a photo");
        }

        Path targetPath = storagePath.resolve(photoKey.trim()).normalize();
        if (!targetPath.startsWith(storagePath)) {
            throw new SecurityException("Invalid photo key");
        }

        if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath)) {
            throw new ResourceNotFoundException("Customer photo file not found on server");
        }

        try {
            byte[] bytes = Files.readAllBytes(targetPath);
            MediaType mediaType = MediaType.IMAGE_JPEG;
            String lower = photoKey.toLowerCase();
            if (lower.endsWith(".png")) {
                mediaType = MediaType.IMAGE_PNG;
            } else if (lower.endsWith(".webp")) {
                mediaType = MediaType.parseMediaType("image/webp");
            }
            return new PhotoData(bytes, mediaType);
        } catch (IOException e) {
            log.error("Failed to read photo file {}: {}", photoKey, e.getMessage());
            throw new RuntimeException("Could not read photo file", e);
        }
    }

    /**
     * Safely deletes a photo file by key.
     */
    public void deletePhoto(String photoKey) {
        if (photoKey == null || photoKey.trim().isEmpty()) {
            return;
        }

        try {
            Path targetPath = storagePath.resolve(photoKey.trim()).normalize();
            if (targetPath.startsWith(storagePath)) {
                Files.deleteIfExists(targetPath);
                log.info("Deleted photo file: {}", photoKey);
            }
        } catch (Exception e) {
            log.warn("Could not delete photo file {}: {}", photoKey, e.getMessage());
        }
    }

    /**
     * Validates that the uploaded bytes are genuine raster image bytes (JPEG, PNG, or WebP).
     * Rejects SVGs, HTML, scripts, corrupted files.
     */
    private void validateRasterImage(byte[] bytes, String extension) {
        if (bytes == null || bytes.length < 12) {
            throw new IllegalArgumentException("Corrupted or empty image file");
        }

        if ("jpg".equals(extension)) {
            // Check JPEG magic bytes: FF D8 FF
            boolean isJpegMagic = (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF);
            if (!isJpegMagic) {
                throw new IllegalArgumentException("Invalid JPEG image signature");
            }
            verifyDecodableImage(bytes);
        } else if ("png".equals(extension)) {
            // Check PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
            byte[] pngMagic = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
            boolean isPngMagic = true;
            for (int i = 0; i < pngMagic.length; i++) {
                if (bytes[i] != pngMagic[i]) {
                    isPngMagic = false;
                    break;
                }
            }
            if (!isPngMagic) {
                throw new IllegalArgumentException("Invalid PNG image signature");
            }
            verifyDecodableImage(bytes);
        } else if ("webp".equals(extension)) {
            // Check WebP magic bytes: RIFF....WEBP
            boolean isRiff = (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F');
            boolean isWebp = (bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P');
            if (!isRiff || !isWebp) {
                throw new IllegalArgumentException("Invalid WebP image signature");
            }
        } else {
            throw new IllegalArgumentException("Unsupported image format: " + extension);
        }
    }

    private void verifyDecodableImage(byte[] bytes) {
        try (InputStream in = new ByteArrayInputStream(bytes)) {
            BufferedImage img = ImageIO.read(in);
            if (img == null) {
                throw new IllegalArgumentException("Could not decode raster image content. File is corrupted or invalid.");
            }
            if (img.getWidth() <= 0 || img.getHeight() <= 0) {
                throw new IllegalArgumentException("Invalid image dimensions");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to decode image: " + e.getMessage());
        }
    }
}
