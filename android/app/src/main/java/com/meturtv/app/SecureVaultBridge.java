package com.meturtv.app;

import android.content.Context;
import android.os.Build;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Small encrypted credential vault for the trusted, locally bundled Metur TV UI.
 * AES-256-GCM keys are generated and kept by Android Keystore; only ciphertext
 * and the per-record IV are stored in app-private SharedPreferences.
 */
public final class SecureVaultBridge {
    private static final String KEY_ALIAS = "metur_tv_credential_v1";
    private static final String PREFS = "metur_tv_encrypted_credentials";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private final Context context;

    public SecureVaultBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public synchronized String putSecret(String name, String value) {
        try {
            validateName(name);
            if (value == null || value.length() > 16384) return "ERROR:invalid_value";
            byte[] iv = new byte[IV_LENGTH];
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            iv = cipher.getIV();
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] packed = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, packed, 0, iv.length);
            System.arraycopy(encrypted, 0, packed, iv.length, encrypted.length);
            String encoded = Base64.encodeToString(packed, Base64.NO_WRAP);
            boolean saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(name, encoded).commit();
            Arrays.fill(packed, (byte) 0);
            Arrays.fill(encrypted, (byte) 0);
            return saved ? "OK" : "ERROR:storage";
        } catch (Exception error) {
            return "ERROR:encryption";
        }
    }

    @JavascriptInterface
    public synchronized String getSecret(String name) {
        try {
            validateName(name);
            String encoded = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(name, null);
            if (encoded == null) return null;
            byte[] packed = Base64.decode(encoded, Base64.NO_WRAP);
            if (packed.length <= IV_LENGTH) return null;
            byte[] iv = Arrays.copyOfRange(packed, 0, IV_LENGTH);
            byte[] encrypted = Arrays.copyOfRange(packed, IV_LENGTH, packed.length);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] clear = cipher.doFinal(encrypted);
            String value = new String(clear, StandardCharsets.UTF_8);
            Arrays.fill(clear, (byte) 0);
            Arrays.fill(encrypted, (byte) 0);
            Arrays.fill(packed, (byte) 0);
            return value;
        } catch (Exception error) {
            return null;
        }
    }

    @JavascriptInterface
    public synchronized String deleteSecret(String name) {
        try {
            validateName(name);
            boolean removed = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().remove(name).commit();
            return removed ? "OK" : "ERROR:storage";
        } catch (Exception error) {
            return "ERROR:invalid_name";
        }
    }

    private void validateName(String name) {
        if (name == null || name.length() < 1 || name.length() > 160
                || !name.matches("[A-Za-z0-9._:-]+")) {
            throw new IllegalArgumentException("Invalid credential key");
        }
    }

    private SecretKey getOrCreateKey() throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            throw new IllegalStateException("Android Keystore AES-GCM requires Android 6.0 or later");
        }
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        java.security.Key existing = keyStore.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }
}
