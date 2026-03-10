// @ts-nocheck
import { subscribeCart } from '@/utils/cartEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from './icon-symbol';

export default function TabIcon({ name, size = 24, color, showBadge = false }: { name: string; size?: number; color: string; showBadge?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const raw = await AsyncStorage.getItem('cart');
        if (!mounted) return;
        if (!raw) { setCount(0); return; }
        const cart = JSON.parse(raw);
        const total = Object.values(cart).reduce((s: any, i: any) => s + (i.qty || 0), 0);
        setCount(total);
      } catch (e) {
        // ignore
      }
    }
    load();
    const unsub = subscribeCart((c) => setCount(c));
    return () => { mounted = false; unsub(); };
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <IconSymbol name={name as any} size={size} color={color} />
      {showBadge && count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2f8b3a',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
