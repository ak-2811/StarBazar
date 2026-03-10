// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function Header({ totalItems = 0, currentUser = null, onOpenUserMenu }) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUser || null);

  const loadUsername = useCallback(async () => {
    try {
      const u = await AsyncStorage.getItem('username');
      if (u) setUsername(u);
      else setUsername(null);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (currentUser) setUsername(currentUser);
    else loadUsername();
  }, [currentUser, loadUsername]);

  useFocusEffect(
    useCallback(() => {
      loadUsername();
    }, [loadUsername])
  );

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Text style={styles.brandIcon}>🌿</Text>
        <Text style={styles.brandName}>StarBazar</Text>
      </View>

      <View style={styles.headerActions}>
        {/* Do not show the logged-in username. Only show Log in when no user is present. */}
        {!username && (
          <Pressable
            style={styles.loginBtn}
            onPress={() => {
              router.push('/login');
            }}>
            <Text style={styles.loginBtnText}>Log in</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const ACCENT = '#2f8b3a';
const ACCENT_LIGHT = '#4caf50';
const MUTED = '#6b7176';
const BORDER_COLOR = '#e0e3e6';
const WHITE = '#FFFFFF';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { fontSize: 24 },
  brandName: { fontSize: 20, fontWeight: '700', color: ACCENT, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8, position: 'relative' },
  iconBtnText: { fontSize: 20 },
  cartBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: ACCENT, borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  cartBadgeText: { color: WHITE, fontSize: 10, fontWeight: '700' },
  userBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: ACCENT_LIGHT, borderRadius: 20,
  },
  userBtnName: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', maxWidth: 70 },
  dropdownArrow: { fontSize: 10, color: '#6b7176' },
  // Login button: light green pill with green border and darker green text to match design
  loginBtn: {
    backgroundColor: 'rgba(47,139,58,0.10)',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  loginBtnText: { fontSize: 13, fontWeight: '700', color: ACCENT },
});

