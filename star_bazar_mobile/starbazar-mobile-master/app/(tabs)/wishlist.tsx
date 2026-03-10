// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/header';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useCart } from "../../context/CartContext";

const BASE_URL = 'http://localhost:8000';
const FRAPPE_URL = 'http://groceryv15.localhost:8001'; // for images served from Frappe backend
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

function ProductCard({ p, cart, likedMap, onLike, onIncrease, onDecrease, onInfo }) {
  const qty = cart[p.item_code]?.qty || 0;

  return (
    <View style={styles.productCard}>
      <View style={styles.productImgWrap}>
        {p.image ? (
          <Image source={{ uri: p.image.startsWith('http') ? p.image : `${FRAPPE_URL}/${p.image}` }} style={styles.productImg} resizeMode="contain" />
        ) : (
          <Text style={styles.productEmoji}>{p.emoji}</Text>
        )}
        {p.back_image && (
          <TouchableOpacity style={styles.infoBtn} onPress={() => onInfo(p)}>
            <Text style={styles.infoBtnText}>i</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.heartBtn, likedMap[p.item_code] && styles.heartBtnLiked]}
        onPress={() => onLike(p.item_code)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.heartBtnText}>{likedMap[p.item_code] ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>

      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={2}>{p.item_name}</Text>
        <Text style={styles.productPrice}>${(p.price || 0).toFixed(2)} <Text style={styles.productUnit}>/ {p.unit}</Text></Text>

        {p.stock <= 0 ? (
          <View style={[styles.addBtn, styles.addBtnDisabled]}>
            <Text style={styles.addBtnDisabledText}>Out of Stock</Text>
          </View>
        ) : qty === 0 ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => onIncrease(p)}>
            <Text style={styles.addBtnText}>Add to Cart</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => onDecrease(p)}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{qty}</Text>
            <TouchableOpacity style={[styles.qtyBtn, qty >= p.stock && styles.qtyBtnDisabled]} onPress={() => onIncrease(p)} disabled={qty >= p.stock}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function NutritionModal({ product, visible, onClose }) {
  const [showBack, setShowBack] = useState(false);

  useEffect(() => { if (visible) setShowBack(false); }, [visible]);
  if (!product) return null;

  const imgUrl = showBack && product.back_image ? (product.back_image.startsWith('http') ? product.back_image : `${FRAPPE_URL}/${product.back_image}`) : (product.image.startsWith('http') ? product.image : `${FRAPPE_URL}/${product.image}`);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{product.item_name} Info</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Text style={styles.closeBtnText}>✕</Text></TouchableOpacity>
          </View>
          <View style={styles.modalImgContainer}>
            <Image source={{ uri: imgUrl }} style={styles.modalImg} resizeMode="contain" />
          </View>
          <View style={styles.modalFooter}>
            <View style={styles.imageNav}>
              <TouchableOpacity style={styles.navArrowBtn} onPress={() => setShowBack(false)}><Text style={styles.navArrowText}>‹</Text></TouchableOpacity>
              <View style={styles.dotsRow}>
                <TouchableOpacity style={[styles.dot, !showBack && styles.dotActive]} onPress={() => setShowBack(false)} />
                {product.back_image && <TouchableOpacity style={[styles.dot, showBack && styles.dotActive]} onPress={() => setShowBack(true)} />}
              </View>
              <TouchableOpacity style={styles.navArrowBtn} onPress={() => product.back_image && setShowBack(true)}><Text style={styles.navArrowText}>›</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}><Text style={styles.doneBtnText}>Done</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function WishlistScreen() {
  const navigation = useNavigation();
  const { cart, increaseQty, decreaseQty } = useCart();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [likedMap, setLikedMap] = useState({});
  const [username, setUsername] = useState(null);
  // const [cart, setCart] = useState({});
  const [selectedNutrition, setSelectedNutrition] = useState(null);
  

  // useEffect(() => {
  //   AsyncStorage.getItem('cart').then(raw => { if (raw) setCart(JSON.parse(raw)); });
  // }, []);

  // useEffect(() => {
  //   AsyncStorage.setItem('cart', JSON.stringify(cart));
  // }, [cart]);

  // useEffect(() => {
  //   const load = async () => {
  //     const user = await AsyncStorage.getItem('username');
  //     setUsername(user);
  //     const token = await AsyncStorage.getItem('token');
  //     if (!token) { setProducts([]); setLoading(false); return; }
  //     try {
  //       const res = await axios.get(`${BASE_URL}/api/wishlist/`, { headers: { Authorization: `Bearer ${token}` } });
  //       const likedCodes = res.data.item_codes || [];
  //       if (!likedCodes.length) { setProducts([]); setLikedMap({}); setLoading(false); return; }
  //       const map = {};
  //       likedCodes.forEach(c => map[c] = true);
  //       setLikedMap(map);
  //       const res2 = await axios.post(`${BASE_URL}/api/wishlist-products/`, { item_codes: likedCodes }, { headers: { Authorization: `Bearer ${token}` } });
  //       setProducts(res2.data.products || []);
  //     } catch (err) {
  //       console.log('Wishlist fetch error', err?.response?.data || err.message || err);
  //     } finally { setLoading(false); }
  //   };
  //   load();
  // }, []);
  useFocusEffect(
  useCallback(() => {
    const load = async () => {
      const user = await AsyncStorage.getItem('username');
      setUsername(user);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/api/wishlist/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const likedCodes = res.data.item_codes || [];

        const map = {};
        likedCodes.forEach(c => map[c] = true);
        setLikedMap(map);

        const res2 = await axios.post(
          `${BASE_URL}/api/wishlist-products/`,
          { item_codes: likedCodes },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setProducts(res2.data.products || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [])
);

  // const increaseQty = (p) => {
  //   const key = p.item_code;
  //   setCart(prev => ({ ...prev, [key]: { item: p, qty: (prev[key]?.qty || 0) + 1 } }));
  // };

  // const decreaseQty = (p) => {
  //   const key = p.item_code;
  //   setCart(prev => {
  //     const qty = prev[key]?.qty || 0;
  //     if (qty <= 1) { const copy = { ...prev }; delete copy[key]; return copy; }
  //     return { ...prev, [key]: { ...prev[key], qty: qty - 1 } };
  //   });
  // };

  const toggleLike = async (item_code) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { navigation.navigate('login'); return; }
    try {
      const res = await axios.post(`${BASE_URL}/api/wishlist/toggle/`, { item_code }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.status === 'removed') {
        setLikedMap(prev => { const updated = { ...prev }; delete updated[item_code]; return updated; });
        setProducts(prev => prev.filter(p => p.item_code !== item_code));
      } else {
        setLikedMap(prev => ({ ...prev, [item_code]: true }));
      }
    } catch (err) { console.log('Toggle error', err?.response?.data || err.message || err); }
  };

  const goToCheckout = () => navigation.navigate('checkout');

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <Header currentUser={username} />
        <View style={styles.center}><ActivityIndicator color="#2f8b3a" /><Text style={styles.loading}>Loading wishlist…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <Header currentUser={username} />
      <View style={styles.container}>
        <Text style={styles.title}>Your Wishlist</Text>

        {products.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>Your wishlist is empty.</Text>
            <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('all-products')}><Text style={styles.ctaText}>Shop Now</Text></TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={products}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 8 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyExtractor={p => p.item_code}
            renderItem={({ item }) => (
              <View style={{ width: CARD_WIDTH }}>
                <ProductCard p={item} cart={cart} likedMap={likedMap} onLike={toggleLike} onIncrease={increaseQty} onDecrease={decreaseQty} onInfo={setSelectedNutrition} />
              </View>
            )}
          />
        )}

        <TouchableOpacity style={styles.checkoutBtn} onPress={goToCheckout}><Text style={styles.checkoutBtnText}>Go to Checkout</Text></TouchableOpacity>
      </View>

      <NutritionModal product={selectedNutrition} visible={!!selectedNutrition} onClose={() => setSelectedNutrition(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafb' },
  container: { padding: 12, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { marginTop: 8, color: '#6b7176' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8, color: '#1A1A2E', paddingHorizontal: 4 },
  empty: { marginTop: 20, alignItems: 'center' },
  emptyText: { color: '#6b7176', marginBottom: 12 },
  cta: { backgroundColor: '#2f8b3a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  ctaText: { color: '#fff', fontWeight: '700' },

  // Product card styles (borrowed from Home)
  productCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e0e3e6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 12,
  },
  productImgWrap: { aspectRatio: 1, backgroundColor: '#f8fafb', justifyContent: 'center', alignItems: 'center', position: 'relative', padding: 8 },
  productImg: { width: '100%', height: '100%', borderRadius: 10 },
  productEmoji: { fontSize: 50 },
  infoBtn: { position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#2f8b3a', justifyContent: 'center', alignItems: 'center' },
  infoBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontStyle: 'italic' },
  heartBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  heartBtnLiked: { backgroundColor: '#FFF0F0' },
  heartBtnText: { fontSize: 15 },
  productBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: '700', color: '#2f8b3a', marginBottom: 8 },
  productUnit: { fontSize: 11, fontWeight: '400', color: '#6b7176' },
  addBtn: { backgroundColor: '#2f8b3a', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  addBtnDisabled: { backgroundColor: '#e0e3e6' },
  addBtnDisabledText: { color: '#6b7176', fontSize: 12, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, overflow: 'hidden' },
  qtyBtn: { width: 44, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e3e6', borderRadius: 8 },
  qtyBtnText: { fontSize: 22, fontWeight: '700', color: '#2f8b3a' },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyValue: { minWidth: 44, height: 40, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#2f8b3a', backgroundColor: 'rgba(47,139,58,0.08)', borderRadius: 8, paddingTop: 10, paddingBottom: 10 },

  // Nutrition modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e3e6' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f8fafb', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 14, color: '#6b7176' },
  modalImgContainer: { height: 260, backgroundColor: '#f8fafb', justifyContent: 'center', alignItems: 'center' },
  modalImg: { width: '90%', height: '90%' },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#e0e3e6', gap: 12 },
  imageNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  navArrowBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' },
  navArrowText: { fontSize: 22, color: '#000', fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e0e3e6' },
  dotActive: { backgroundColor: '#2f8b3a', width: 22 },
  doneBtn: { backgroundColor: '#2f8b3a', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  checkoutBtn: { marginTop: 8, backgroundColor: '#2f8b3a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontWeight: '800' },
});
