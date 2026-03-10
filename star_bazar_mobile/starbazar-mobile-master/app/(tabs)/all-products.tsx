// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useCart } from "../../context/CartContext";

const BASE_URL = 'http://localhost:8000';
const FRAPPE_URL = 'http://groceryv15.localhost:8001';
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Colors (same tokens as home)
const ACCENT = '#2f8b3a';
const ACCENT_LIGHT = '#4caf50';
const MUTED = '#6b7176';
const PAGE_BG = '#f8fafb';
const BORDER_COLOR = '#e0e3e6';
const WHITE = '#FFFFFF';
const DARK = '#1A1A2E';

function ProductCard({ p, cart, liked, onLike, onIncrease, onDecrease, onInfo }) {
  const qty = cart[p.item_code]?.qty || 0;
  // console.log(p.item_name, p.stock, typeof p.stock);
  return (
    
    <View style={styles.productCard}>
      <View style={styles.productImgWrap}>
        {p.image ? (
          <Image source={{ uri: `${FRAPPE_URL}/${p.image}` }} style={styles.productImg} resizeMode="contain" />
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
        style={[styles.heartBtn, liked[p.item_code] && styles.heartBtnLiked]}
        onPress={() => onLike(p.item_code)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.heartBtnText}>{liked[p.item_code] ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>

      <View style={styles.productBody}>
        <Text style={styles.productName} numberOfLines={2}>{p.item_name}</Text>
        <Text style={styles.productPrice}>${p.price.toFixed(2)} <Text style={styles.productUnit}>{p.unit}</Text></Text>

        {Number(p.stock)<=0 ? (
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

  const imgUrl = showBack && product.back_image ? `${FRAPPE_URL}/${product.back_image}` : `${FRAPPE_URL}/${product.image}`;

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
            <View style={styles.imageLabelWrap}><Text style={styles.imageLabel}>{showBack ? 'Nutrition & Details' : 'Product View'}</Text></View>
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

export default function AllProductsScreen() {
  const navigation = useNavigation();
  const { cart, increaseQty, decreaseQty } = useCart(); 
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState(['all']);
  const [filters, setFilters] = useState({ category: 'all', searchTerm: '' });
  const [sortBy, setSortBy] = useState('price-low');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // const [cart, setCart] = useState({});
  const [liked, setLiked] = useState({});
  const [selectedNutrition, setSelectedNutrition] = useState(null);

  // load cart
  // useEffect(() => { AsyncStorage.getItem('cart').then(raw => raw && setCart(JSON.parse(raw))); }, []);
  // useEffect(() => { AsyncStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  // fetch categories
  useEffect(() => {
    axios.get(`${BASE_URL}/api/categories/`).then(res => setCategories(['all', ...res.data.categories])).catch(() => {});
  }, []);

  // fetch wishlist (basic, with token refresh attempt)
  // useEffect(() => {
  //   const fetchWishlist = async () => {
  //     const access = await AsyncStorage.getItem('token');
  //     const refresh = await AsyncStorage.getItem('refresh');
  //     if (!access) return;
  //     try {
  //       const res = await axios.get(`${BASE_URL}/api/wishlist/`, { headers: { Authorization: `Bearer ${access}` } });
  //       const likedMap = {};
  //       res.data.item_codes.forEach(code => { likedMap[code] = true; });
  //       setLiked(likedMap);
  //     } catch (err) {
  //       if (err.response?.status === 401 && refresh) {
  //         try {
  //           const refreshRes = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh });
  //           const newAccess = refreshRes.data.access;
  //           await AsyncStorage.setItem('token', newAccess);
  //           const retry = await axios.get(`${BASE_URL}/api/wishlist/`, { headers: { Authorization: `Bearer ${newAccess}` } });
  //           const likedMap = {};
  //           retry.data.item_codes.forEach(code => { likedMap[code] = true; });
  //           setLiked(likedMap);
  //         } catch {
  //           await AsyncStorage.multiRemove(['token','refresh','username']);
  //           navigation.navigate('Login');
  //         }
  //       }
  //     }
  //   };
  //   fetchWishlist();
  // }, [navigation]);

  useFocusEffect(
  useCallback(() => {
    const fetchWishlist = async () => {
      const access = await AsyncStorage.getItem('token');
      const refresh = await AsyncStorage.getItem('refresh');

      if (!access) return;

      try {
        const res = await axios.get(`${BASE_URL}/api/wishlist/`, {
          headers: { Authorization: `Bearer ${access}` },
        });

        const likedMap = {};
        res.data.item_codes.forEach(code => {
          likedMap[code] = true;
        });

        setLiked(likedMap);
      } catch (err) {
        if (err.response?.status === 401 && refresh) {
          try {
            const refreshRes = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh });
            const newAccess = refreshRes.data.access;

            await AsyncStorage.setItem('token', newAccess);

            const retry = await axios.get(`${BASE_URL}/api/wishlist/`, {
              headers: { Authorization: `Bearer ${newAccess}` },
            });

            const likedMap = {};
            retry.data.item_codes.forEach(code => {
              likedMap[code] = true;
            });

            setLiked(likedMap);
          } catch {
            await AsyncStorage.multiRemove(['token','refresh','username']);
            navigation.navigate('Login');
          }
        }
      }
    };

    fetchWishlist();
  }, [navigation])
);

  // fetch products
  useEffect(() => {
    setLoading(true);
    axios.get(`${BASE_URL}/api/all-products/`, {
      params: {
        page: currentPage,
        page_size: 12,
        category: filters.category,
        search: filters.searchTerm,
        sort_by: sortBy,
      }
    })
    .then(res => {
      const formatted = res.data.products.map((item, index) => ({
        id: index + 1,
        item_code: item.item_code,
        item_name: item.item_name,
        price: parseFloat(item.price),
        unit: `/ ${item.unit}`,
        category: item.category || 'General',
        brand: item.brand || null,
        image: item.image,
        back_image: item.back_image,
        stock: item.stock,
        in_stock: item.stock > 0,
      }));
      setAllProducts(formatted);
      setTotalPages(Math.ceil(res.data.total_count / 12));
      setTotalCount(res.data.total_count);
    })
    .catch(err => console.error('Products fetch error', err))
    .finally(() => setLoading(false));
  }, [currentPage, filters, sortBy]);

  // const increaseQty = (p) => setCart(prev => ({ ...prev, [p.item_code]: { item: p, qty: (prev[p.item_code]?.qty || 0) + 1 } }));
  // const decreaseQty = (p) => setCart(prev => {
  //   const qty = prev[p.item_code]?.qty || 0; if (qty <= 1) { const updated = { ...prev }; delete updated[p.item_code]; return updated; }
  //   return { ...prev, [p.item_code]: { ...prev[p.item_code], qty: qty - 1 } };
  // });

  const toggleLike = async (item_code) => {
    const access = await AsyncStorage.getItem('token');
    const refresh = await AsyncStorage.getItem('refresh');
    if (!access) { navigation.navigate('Login'); return; }
    try {
      const res = await axios.post(`${BASE_URL}/api/wishlist/toggle/`, { item_code }, { headers: { Authorization: `Bearer ${access}` } });
      setLiked(prev => ({ ...prev, [item_code]: res.data.status === 'added' }));
    } catch (err) {
      if (err.response?.status === 401 && refresh) {
        try {
          const refreshRes = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh });
          const newAccess = refreshRes.data.access; await AsyncStorage.setItem('token', newAccess);
          const retry = await axios.post(`${BASE_URL}/api/wishlist/toggle/`, { item_code }, { headers: { Authorization: `Bearer ${newAccess}` } });
          setLiked(prev => ({ ...prev, [item_code]: retry.data.status === 'added' }));
        } catch {
          await AsyncStorage.multiRemove(['token','refresh','username']); navigation.navigate('Login');
        }
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading products…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}> 
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.brandIcon}>🌿</Text>
          <Text style={styles.brandName}>StarBazar</Text>
        </View>
        {/* Right side intentionally left empty: header should only show the brand (no wishlist icon) */}
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.heroBannerSmall}>
        <Text style={styles.pageTitle}>Shop All Products</Text>
        <TextInput placeholder="Search products..." value={filters.searchTerm} onChangeText={t => setFilters(prev => ({ ...prev, searchTerm: t }))} style={styles.searchInput} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, paddingHorizontal: 12 }}>
          {categories.map(cat => (
            <TouchableOpacity key={cat} style={[styles.catBtn, filters.category === cat && styles.catBtnActive]} onPress={() => { setFilters(prev => ({ ...prev, category: cat })); setCurrentPage(1); }}>
              <Text style={[styles.catText, filters.category === cat && styles.catTextActive]}>{cat === 'all' ? 'All' : cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* <FlatList
        data={allProducts}
        keyExtractor={p => p.item_code}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <ProductCard p={item} cart={cart} liked={liked} onLike={toggleLike} onIncrease={increaseQty} onDecrease={decreaseQty} onInfo={setSelectedNutrition} />
          </View>
        )}
        ListFooterComponent={() => (
          <View style={{ paddingVertical: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
              <TouchableOpacity disabled={currentPage === 1} onPress={() => setCurrentPage(p => Math.max(1, p - 1))} style={[styles.pagiBtn, currentPage === 1 && { opacity: 0.5 }]}>
                <Text style={styles.pagiText}>← Previous</Text>
              </TouchableOpacity>
              <Text style={{ alignSelf: 'center' }}>{currentPage} / {totalPages}</Text>
              <TouchableOpacity disabled={currentPage === totalPages} onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={[styles.pagiBtn, currentPage === totalPages && { opacity: 0.5 }]}>
                <Text style={styles.pagiText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      /> */}

      <FlatList
        data={allProducts}
        keyExtractor={(p) => p.item_code}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 100, flexGrow: 1 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <ProductCard
              p={item}
              cart={cart}
              liked={liked}
              onLike={toggleLike}
              onIncrease={increaseQty}
              onDecrease={decreaseQty}
              onInfo={setSelectedNutrition}
            />
          </View>
        )}
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={{ paddingVertical: 24 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                }}
              >
                <TouchableOpacity
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={[styles.pagiBtn, currentPage === 1 && { opacity: 0.5 }]}
                >
                  <Text style={styles.pagiText}>← Previous</Text>
                </TouchableOpacity>

                <Text style={{ fontWeight: '600' }}>
                  {currentPage} / {totalPages}
                </Text>

                <TouchableOpacity
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={[
                    styles.pagiBtn,
                    currentPage === totalPages && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.pagiText}>Next →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
        }
      />

      <NutritionModal product={selectedNutrition} visible={!!selectedNutrition} onClose={() => setSelectedNutrition(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: WHITE },
  loadingText: { marginTop: 12, fontSize: 16, color: MUTED },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  brandIcon: { fontSize: 22 },
  brandName: { fontSize: 18, fontWeight: '700', color: ACCENT, marginLeft: 8 },
  iconBtn: { padding: 8 }, iconBtnText: { fontSize: 18 },
  heroBannerSmall: { padding: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  pageTitle: { fontSize: 20, fontWeight: '800', color: DARK },
  searchInput: { marginTop: 8, backgroundColor: PAGE_BG, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: BORDER_COLOR },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: WHITE, borderRadius: 20, borderWidth: 1, borderColor: BORDER_COLOR, marginRight: 8 },
  catBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  catText: { color: DARK }, catTextActive: { color: WHITE },
  productCard: { backgroundColor: WHITE, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: BORDER_COLOR, marginBottom: 12 },
  productImgWrap: { aspectRatio: 1, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center', position: 'relative', padding: 8 },
  productImg: { width: '100%', height: '100%', borderRadius: 10 },
  productEmoji: { fontSize: 42 },
  infoBtn: { position: 'absolute', bottom: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  infoBtnText: { color: WHITE, fontWeight: '700', fontSize: 12 },
  heartBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  heartBtnLiked: { backgroundColor: '#FFF0F0' }, heartBtnText: { fontSize: 15 },
  productBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '600', color: DARK, marginBottom: 6 },
  productPrice: { fontSize: 15, fontWeight: '700', color: ACCENT, marginBottom: 12 },
  productUnit: { fontSize: 11, color: MUTED },
  addBtn: { backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 2 }, addBtnText: { color: WHITE, fontWeight: '700' }, addBtnDisabled: { backgroundColor: BORDER_COLOR }, addBtnDisabledText: { color: MUTED },
  qtyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, overflow: 'hidden' },
  qtyBtn: {
    width: 44,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyBtnText: { fontSize: 22, fontWeight: '700', color: ACCENT },
  qtyValue: { minWidth: 44, height: 40, textAlign: 'center', fontSize: 14, fontWeight: '700', color: ACCENT, backgroundColor: 'rgba(47,139,58,0.08)', borderRadius: 8, paddingTop: 10, paddingBottom: 10 }, qtyBtnDisabled: { opacity: 0.4 },
  // Modal styles (same as Home)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: WHITE, borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR }, modalTitle: { fontSize: 16, fontWeight: '700', color: DARK, flex: 1 }, closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }, closeBtnText: { fontSize: 14, color: MUTED },
  modalImgContainer: { height: 260, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }, modalImg: { width: '90%', height: '90%' }, imageLabelWrap: { position: 'absolute', bottom: 8, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }, imageLabel: { color: WHITE, fontSize: 12 }, modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER_COLOR }, imageNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }, navArrowBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE, borderWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center' }, navArrowText: { fontSize: 22, color: '#000', fontWeight: '700' }, dotsRow: { flexDirection: 'row', gap: 8 }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BORDER_COLOR }, dotActive: { backgroundColor: ACCENT, width: 22 }, doneBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }, doneBtnText: { color: WHITE, fontSize: 15, fontWeight: '700' },
  // pagination
  pagiBtn: { padding: 8 }, pagiText: { color: ACCENT, fontWeight: '700' },
});
