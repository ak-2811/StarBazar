import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import TabIcon from '@/components/ui/tab-icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        // show labels under icons and use app accent (green) as active color
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#2f8b3a',
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].icon,
        // spacing and label style to avoid truncation and give a modern feel
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
        tabBarItemStyle: { marginHorizontal: 8, paddingVertical: 6 },
        // rounded elevated tab bar that floats above the bottom edge
        tabBarStyle: {
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 18,
          height: 76,
          paddingHorizontal: 6,
          borderRadius: 18,
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopWidth: 0,
          // iOS shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          // Android elevation
          elevation: 10,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="all-products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="line.3.horizontal" color={color} />,
        }}
      />
      {/* make checkout visible as the Cart tab */}
      <Tabs.Screen
        name="checkout"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => <TabIcon name="bag" size={28} color={color} showBadge />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
        }}
      />
      {/* Profile tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person" color={color} />,
        }}
      />
    
    </Tabs>
  );
}
