package com.udhaar.backend.service;

import com.udhaar.backend.dto.*;
import com.udhaar.backend.entity.Customer;
import com.udhaar.backend.entity.CustomerAlias;
import com.udhaar.backend.entity.User;
import com.udhaar.backend.entity.enums.Role;
import com.udhaar.backend.exception.ResourceNotFoundException;
import com.udhaar.backend.repository.CreditEntryRepository;
import com.udhaar.backend.repository.CustomerAliasRepository;
import com.udhaar.backend.repository.CustomerRepository;
import com.udhaar.backend.repository.PaymentRepository;
import com.udhaar.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerPhotoAndIdentityTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private CustomerAliasRepository customerAliasRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CreditEntryRepository creditEntryRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PhotoStorageService photoStorageService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private CustomerService customerService;

    private User ownerA;
    private User ownerB;
    private Customer customerA;

    @BeforeEach
    void setUp() {
        ownerA = User.builder()
                .id(1L)
                .email("ownerA@test.com")
                .name("Owner A")
                .role(Role.BUSINESS_OWNER)
                .build();

        ownerB = User.builder()
                .id(2L)
                .email("ownerB@test.com")
                .name("Owner B")
                .role(Role.BUSINESS_OWNER)
                .build();

        customerA = Customer.builder()
                .id(101L)
                .user(ownerA)
                .name("Ramesh Kumar")
                .phone("9876543210")
                .address("Chandrapuri Colony")
                .notes("Hardware supplier")
                .createdAt(LocalDateTime.now())
                .build();

        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn("ownerA@test.com");
        lenient().when(authentication.getName()).thenReturn("ownerA@test.com");
        SecurityContextHolder.setContext(securityContext);
        lenient().when(userRepository.findByEmail("ownerA@test.com")).thenReturn(Optional.of(ownerA));
        lenient().when(userRepository.findByEmail("ownerB@test.com")).thenReturn(Optional.of(ownerB));
    }

    private MockMultipartFile createValidJpegFile() throws IOException {
        BufferedImage image = new BufferedImage(100, 100, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", baos);
        return new MockMultipartFile("file", "test.jpg", "image/jpeg", baos.toByteArray());
    }

    @Test
    void testUploadPhoto_Success() throws IOException {
        MockMultipartFile file = createValidJpegFile();
        when(customerRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(customerA));
        when(photoStorageService.storePhoto(file)).thenReturn("uuid-123.jpg");
        when(customerRepository.save(any(Customer.class))).thenAnswer(i -> i.getArgument(0));

        CustomerResponse response = customerService.uploadCustomerPhoto(101L, file);

        assertNotNull(response);
        assertTrue(response.isHasPhoto());
        assertEquals("Hardware supplier", response.getNotes());
        verify(photoStorageService, times(1)).storePhoto(file);
        verify(customerRepository, times(1)).save(customerA);
    }

    @Test
    void testUploadPhoto_ReplacesPreviousPhotoSafely() throws IOException {
        customerA.setPhotoKey("old-photo.jpg");
        MockMultipartFile newFile = createValidJpegFile();

        when(customerRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(customerA));
        when(photoStorageService.storePhoto(newFile)).thenReturn("new-photo.jpg");
        when(customerRepository.save(any(Customer.class))).thenAnswer(i -> i.getArgument(0));

        CustomerResponse response = customerService.uploadCustomerPhoto(101L, newFile);

        assertNotNull(response);
        assertTrue(response.isHasPhoto());
        verify(photoStorageService, times(1)).deletePhoto("old-photo.jpg");
    }

    @Test
    void testGetPhoto_MissingPhoto_ThrowsNotFound() {
        customerA.setPhotoKey(null);
        when(customerRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(customerA));

        assertThrows(ResourceNotFoundException.class, () -> {
            customerService.getCustomerPhoto(101L);
        });
    }

    @Test
    void testGetPhoto_OwnerIsolation_OwnerBCannotAccessOwnerACustomerPhoto() {
        // Authenticated as Owner B
        when(authentication.getName()).thenReturn("ownerB@test.com");
        // Customer 101 belongs to Owner A (userId 1), query by id and user 2 returns empty
        when(customerRepository.findByIdAndUserId(101L, 2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            customerService.getCustomerPhoto(101L);
        });
        verify(photoStorageService, never()).loadPhoto(anyString());
    }

    @Test
    void testDeletePhoto_Success() {
        customerA.setPhotoKey("my-photo.jpg");
        when(customerRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(customerA));
        when(customerRepository.save(any(Customer.class))).thenAnswer(i -> i.getArgument(0));

        CustomerResponse response = customerService.deleteCustomerPhoto(101L);

        assertFalse(response.isHasPhoto());
        assertNull(customerA.getPhotoKey());
        verify(photoStorageService, times(1)).deletePhoto("my-photo.jpg");
    }

    @Test
    void testAliasOperations_AddAndList() {
        when(customerRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(customerA));
        when(customerAliasRepository.findByCustomerIdAndAliasNameIgnoreCase(101L, "Ramesh Bhai"))
                .thenReturn(Optional.empty());

        CustomerAlias alias = CustomerAlias.builder()
                .id(50L)
                .customer(customerA)
                .aliasName("Ramesh Bhai")
                .source("MANUAL")
                .confidence(BigDecimal.ONE)
                .createdAt(LocalDateTime.now())
                .build();
        when(customerAliasRepository.save(any(CustomerAlias.class))).thenReturn(alias);

        CreateCustomerAliasRequest req = new CreateCustomerAliasRequest("Ramesh Bhai");
        CustomerAliasResponse created = customerService.addCustomerAlias(101L, req);

        assertNotNull(created);
        assertEquals("Ramesh Bhai", created.getAliasName());
        assertEquals(101L, created.getCustomerId());
    }

    @Test
    void testAliasOperations_OwnerIsolation_OwnerBCannotDeleteOwnerAAlias() {
        when(authentication.getName()).thenReturn("ownerB@test.com");
        when(customerRepository.findByIdAndUserId(101L, 2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            customerService.deleteCustomerAlias(101L, 50L);
        });
        verify(customerAliasRepository, never()).delete(any(CustomerAlias.class));
    }
}
