// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Header from '../../components/header';

const BASE_URL = 'http://localhost:8000';

export default function OrdersScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setOrders([]);
        return;
      }
      const res = await axios.get(`${BASE_URL}/api/orders/`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data || []);
    } catch (err) {
      console.log('Orders fetch error', err?.response?.data || err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('username').then(name => setCurrentUser(name));
      fetchOrders();
    }, [])
  );

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'username', 'refresh']);
    navigation.navigate('login');
  };

  const handleReorder = async (order) => {
    try {
      const itemCodes = order.items.map(i => i.item_code).filter(Boolean);
      if (itemCodes.length === 0) return;

      const res = await axios.post(`${BASE_URL}/api/products-by-codes/`, { item_codes: itemCodes });
      const products = res.data.products || [];

      const cartRaw = await AsyncStorage.getItem('cart');
      const cart = cartRaw ? JSON.parse(cartRaw) : {};

      products.forEach(product => {
        const orderItem = order.items.find(i => i.item_code === product.item_code);
        if (!orderItem) return;
        const qty = orderItem.qty || 1;
        const key = product.item_code;
        if (cart[key]) cart[key].qty += qty;
        else cart[key] = { item: product, qty };
      });

      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      // navigate to checkout
      navigation.navigate('checkout');
    } catch (err) {
      console.log('Reorder error', err?.response?.data || err.message || err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <Header currentUser={currentUser} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2f8b3a" />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <Header currentUser={currentUser} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your Orders</Text>
        <Text style={styles.subtitle}>Track, reorder or review past purchases</Text>

        {orders.length === 0 ? (
          <View style={styles.empty}> <Text style={styles.emptyText}>No orders found.</Text> </View>
        ) : (
          orders.map(order => {
            const isOpen = !!expanded[order.id];
            return (
              <View key={order.id} style={[styles.card, isOpen && styles.cardOpen]}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggle(order.id)}>
                  <View style={styles.metaLeft}>
                    <Text style={styles.metaLabel}>ORDER ID</Text>
                    <Text style={styles.metaValue}>#{order.id}</Text>
                    <Text style={styles.metaSmall}>{order.date} • {order.time || ''}</Text>
                  </View>
                  <View style={styles.metaRight}>
                    <Text style={styles.metaLabel}>TOTAL</Text>
                    <Text style={styles.metaValue}>${(order.total || 0).toFixed(2)}</Text>
                    <Text style={styles.itemsPill}>{order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}</Text>
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.cardBody}>
                    {order.items.map((it, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Image source={{ uri: it.image }} style={styles.itemImg} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{it.name}</Text>
                          <Text style={styles.itemDetails}>{it.details}</Text>
                        </View>
                        <View style={styles.itemMeta}>
                          <Text style={styles.itemPrice}>${(it.price || 0).toFixed(2)}</Text>
                          <Text style={styles.itemQty}>Qty: {it.qty}</Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.reorderBtn} onPress={() => handleReorder(order)}>
                        <Text style={styles.reorderBtnText}>Reorder</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafb' },
  container: { padding: 16, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7176' },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { color: '#6b7176', marginBottom: 12 },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#6b7176' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#e0e3e6' },
  cardOpen: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaLeft: { flex: 1 },
  metaRight: { alignItems: 'flex-end' },
  metaLabel: { fontSize: 11, color: '#6b7176', fontWeight: '700' },
  metaValue: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginTop: 4 },
  metaSmall: { color: '#6b7176', marginTop: 4 },
  itemsPill: { marginTop: 6, backgroundColor: 'rgba(47,139,58,0.08)', color: '#2f8b3a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, fontWeight: '700' },
  cardBody: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemImg: { width: 64, height: 64, borderRadius: 8, marginRight: 12, backgroundColor: '#f6f6f6' },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '700', color: '#1A1A2E' },
  itemDetails: { color: '#6b7176', marginTop: 4 },
  itemMeta: { alignItems: 'flex-end' },
  itemPrice: { fontWeight: '800', color: '#2f8b3a' },
  itemQty: { color: '#6b7176', marginTop: 6 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  reorderBtn: { backgroundColor: '#2f8b3a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  reorderBtnText: { color: '#fff', fontWeight: '800' },
});
