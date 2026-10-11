package com.udhaar.backend.service;

import com.udhaar.backend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class PhotoStorageServiceTest {

    private PhotoStorageService photoStorageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        photoStorageService = new PhotoStorageService();
        ReflectionTestUtils.setField(photoStorageService, "photoDirProperty", tempDir.toString());
        photoStorageService.init();
    }

    private byte[] generateValidImageBytes(String format) throws IOException {
        BufferedImage img = new BufferedImage(50, 50, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, format, baos);
        return baos.toByteArray();
    }

    @Test
    void testStorePhoto_ValidJpeg_Success() throws IOException {
        byte[] bytes = generateValidImageBytes("jpg");
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", bytes);

        String photoKey = photoStorageService.storePhoto(file);

        assertNotNull(photoKey);
        assertTrue(photoKey.endsWith(".jpg"));

        PhotoStorageService.PhotoData loaded = photoStorageService.loadPhoto(photoKey);
        assertNotNull(loaded);
        assertEquals(bytes.length, loaded.getBytes().length);
    }

    @Test
    void testStorePhoto_ValidPng_Success() throws IOException {
        byte[] bytes = generateValidImageBytes("png");
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", bytes);

        String photoKey = photoStorageService.storePhoto(file);

        assertNotNull(photoKey);
        assertTrue(photoKey.endsWith(".png"));

        PhotoStorageService.PhotoData loaded = photoStorageService.loadPhoto(photoKey);
        assertNotNull(loaded);
        assertEquals(bytes.length, loaded.getBytes().length);
    }

    @Test
    void testStorePhoto_UnsupportedFormat_RejectsHtmlOrSvg() {
        MockMultipartFile htmlFile = new MockMultipartFile(
                "file",
                "malicious.html",
                "text/html",
                "<html><body>malicious</body></html>".getBytes()
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            photoStorageService.storePhoto(htmlFile);
        });
        assertTrue(ex.getMessage().contains("Unsupported image format"));
    }

    @Test
    void testStorePhoto_FakeExtensionWithHtmlBytes_RejectsCorruptedImage() {
        MockMultipartFile fakeFile = new MockMultipartFile(
                "file",
                "fake.jpg",
                "image/jpeg",
                "<svg><script>alert(1)</script></svg>".getBytes()
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            photoStorageService.storePhoto(fakeFile);
        });
        assertTrue(ex.getMessage().contains("signature") || ex.getMessage().contains("Invalid"));
    }

    @Test
    void testStorePhoto_ExceedsFileSizeLimit_Rejects() {
        byte[] largeBytes = new byte[(int) PhotoStorageService.MAX_FILE_SIZE + 1024];
        MockMultipartFile oversizedFile = new MockMultipartFile(
                "file",
                "huge.jpg",
                "image/jpeg",
                largeBytes
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            photoStorageService.storePhoto(oversizedFile);
        });
        assertTrue(ex.getMessage().contains("exceeds maximum limit of 5 MB"));
    }

    @Test
    void testDeletePhoto_RemovesFileFromDisk() throws IOException {
        byte[] bytes = generateValidImageBytes("jpg");
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", bytes);

        String photoKey = photoStorageService.storePhoto(file);
        assertNotNull(photoStorageService.loadPhoto(photoKey));

        photoStorageService.deletePhoto(photoKey);

        assertThrows(ResourceNotFoundException.class, () -> {
            photoStorageService.loadPhoto(photoKey);
        });
    }
}
