package io.yak.ops.common.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import java.lang.reflect.Field;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserTypeTest {

    @Test
    void mapsPersistedCodesToUserTypes() {
        assertEquals(UserType.ADMIN_USER, UserType.fromCode(0));
        assertEquals(UserType.GENERAL_USER, UserType.fromCode(1));
    }

    @Test
    void rejectsUnknownPersistedCodeWithClearMessage() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> UserType.fromCode(2));
        assertTrue(exception.getMessage().contains("Unknown user type code: 2"));
    }

    @Test
    void codeIsTheMyBatisPlusEnumValue() throws NoSuchFieldException {
        Field code = UserType.class.getDeclaredField("code");
        assertTrue(code.isAnnotationPresent(EnumValue.class));
    }
}
