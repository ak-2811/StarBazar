import { emitCart } from '@/utils/cartEvents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useCart } from "../../context/CartContext";
import Header from '../../components/header';

const BASE_URL = 'http://localhost:8000';
const FRAPPE_URL = 'http://groceryv15.localhost:8001'; // for images served from Frappe backend
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ─── TOKEN REFRESH HELPER ────────────────────────────────────────────────────
async function refreshAccessToken() {
  const refresh = await AsyncStorage.getItem('refresh');
  if (!refresh) throw new Error('No refresh token');
  const res = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh });
  await AsyncStorage.setItem('token', res.data.access);
  return res.data.access;
}

async function authGet(url) {
  let token = await AsyncStorage.getItem('token');
  try {
    return await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    if (err.response?.status === 401) {
      token = await refreshAccessToken();
      return axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    }
    throw err;
  }
}

async function authPost(url, data) {
  let token = await AsyncStorage.getItem('token');
  try {
    return await axios.post(url, data, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    if (err.response?.status === 401) {
      token = await refreshAccessToken();
      return axios.post(url, data, { headers: { Authorization: `Bearer ${token}` } });
    }
    throw err;
  }
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ p, cart, liked, onLike, onIncrease, onDecrease, onInfo }) {
  const qty = cart[p.item_code]?.qty || 0;

  return (
    <View style={styles.productCard}>
      <View style={styles.productImgWrap}>
        {p.image ? (
            <Image
              source={{ uri: `${FRAPPE_URL}/${p.image}` }}
              style={styles.productImg}
              resizeMode="contain"
            />
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
        <Text style={styles.productPrice}>
          ${p.price.toFixed(2)}{' '}
          <Text style={styles.productUnit}>/ {p.unit}</Text>
        </Text>

        {!p.in_stock ? (
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
            <TouchableOpacity
              style={[styles.qtyBtn, qty >= p.stock && styles.qtyBtnDisabled]}
              onPress={() => onIncrease(p)}
              disabled={qty >= p.stock}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── OFFER CARD ───────────────────────────────────────────────────────────────
function OfferCard({ p, cart, onIncrease, onDecrease }) {
  const qty = cart[p.item_code]?.qty || 0;

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerBadge}>
        <Text style={styles.offerBadgeText}>Special Deal</Text>
      </View>
      <View style={styles.offerImgWrap}>
        {p.image ? (
            <Image
              source={{ uri: `${FRAPPE_URL}/${p.image}` }}
              style={styles.offerImg}
              resizeMode="contain"
            />
        ) : (
          <Text style={styles.productEmoji}>{p.emoji}</Text>
        )}
      </View>
      <View style={styles.offerBody}>
        <Text style={styles.offerName} numberOfLines={2}>{p.item_name}</Text>
        <Text style={styles.originalPrice}>${p.original_price.toFixed(2)}</Text>
        <Text style={styles.offerTitle}>{p.title}</Text>

        {!p.in_stock ? (
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
            <TouchableOpacity
              style={[styles.qtyBtn, qty >= p.stock && styles.qtyBtnDisabled]}
              onPress={() => onIncrease(p)}
              disabled={qty >= p.stock}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── NUTRITION MODAL ──────────────────────────────────────────────────────────
function NutritionModal({ product, visible, onClose }) {
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (visible) setShowBack(false);
  }, [visible]);

  if (!product) return null;

  const imgUrl = showBack && product.back_image
    ? `${FRAPPE_URL}/${product.back_image}`
    : `${FRAPPE_URL}/${product.image}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{product.item_name} Info</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalImgContainer}>
            <Image
              source={{ uri: imgUrl }}
              style={styles.modalImg}
              resizeMode="contain"
            />
            <View style={styles.imageLabelWrap}>
              <Text style={styles.imageLabel}>
                {showBack ? 'Nutrition & Details' : 'Product View'}
              </Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <View style={styles.imageNav}>
              <TouchableOpacity
                style={styles.navArrowBtn}
                onPress={() => setShowBack(false)}
              >
                <Text style={styles.navArrowText}>‹</Text>
              </TouchableOpacity>

              <View style={styles.dotsRow}>
                <TouchableOpacity
                  style={[styles.dot, !showBack && styles.dotActive]}
                  onPress={() => setShowBack(false)}
                />
                {product.back_image && (
                  <TouchableOpacity
                    style={[styles.dot, showBack && styles.dotActive]}
                    onPress={() => setShowBack(true)}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.navArrowBtn}
                onPress={() => product.back_image && setShowBack(true)}
              >
                <Text style={styles.navArrowText}>›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── USER MENU MODAL ──────────────────────────────────────────────────────────
function UserMenu({ visible, username, onOrders, onLogout, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.userMenu}>
          <Text style={styles.userMenuName}>👤 {username}</Text>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={onOrders}>
            <Text style={styles.menuItemText}>📦 Your Orders</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <Text style={[styles.menuItemText, styles.menuItemLogout]}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── MAIN HOME SCREEN ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation();
  const { cart, increaseQty, decreaseQty } = useCart();

  const [bestSellers, setBestSellers] = useState([]);
  const [shopAllProducts, setShopAllProducts] = useState([]);
  const [specialOffers, setSpecialOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // const [cart, setCart] = useState({});
  const [liked, setLiked] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedNutrition, setSelectedNutrition] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Load cart from AsyncStorage
  // useEffect(() => {
  //   AsyncStorage.getItem('cart').then(raw => {
  //     if (raw) setCart(JSON.parse(raw));
  //   });
  // }, []);

  // // Persist cart on change
  // useEffect(() => {
  //   AsyncStorage.setItem('cart', JSON.stringify(cart));
  //   try {
  //     const total = Object.values(cart).reduce((s, i) => s + (i.qty || 0), 0);
  //     emitCart(total);
  //   } catch (e) {}
  // }, [cart]);

  // Check user on screen focus
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.multiGet(['token', 'username']).then(pairs => {
        const token = pairs[0][1];
        const username = pairs[1][1];
        setCurrentUser(token && username ? username : null);
      });
    }, [])
  );

  // Fetch products
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [bs, all, offers] = await Promise.all([
          axios.get(`${BASE_URL}/api/best-sellers/`),
          axios.get(`${BASE_URL}/api/shop-all-products/`),
          axios.get(`${BASE_URL}/api/pricing-offers/`),
        ]);
        setBestSellers(bs.data);
        setShopAllProducts(all.data);
        setSpecialOffers(offers.data);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Fetch wishlist
  // useEffect(() => {
  //   const fetchWishlist = async () => {
  //     const token = await AsyncStorage.getItem('token');
  //     if (!token) return;
  //     try {
  //       const res = await authGet(`${BASE_URL}/api/wishlist/`);
  //       const likedMap = {};
  //       res.data.item_codes.forEach(code => { likedMap[code] = true; });
  //       setLiked(likedMap);
  //     } catch {
  //       // silent fail
  //     }
  //   };
  //   fetchWishlist();
  // }, []);
  useFocusEffect(
  useCallback(() => {
    const fetchWishlist = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const res = await authGet(`${BASE_URL}/api/wishlist/`);

        const likedMap = {};
        res.data.item_codes.forEach(code => {
          likedMap[code] = true;
        });

        setLiked(likedMap);
      } catch (e) {
        console.log("Wishlist fetch error", e);
      }
    };

    fetchWishlist();
  }, [])
);

  // Cart helpers
  // const increaseQty = (p) => {
  //   setCart(prev => ({
  //     ...prev,
  //     [p.item_code]: { item: p, qty: (prev[p.item_code]?.qty || 0) + 1 },
  //   }));
  // };

  // const decreaseQty = (p) => {
  //   setCart(prev => {
  //     const qty = prev[p.item_code]?.qty || 0;
  //     if (qty <= 1) {
  //       const updated = { ...prev };
  //       delete updated[p.item_code];
  //       return updated;
  //     }
  //     return { ...prev, [p.item_code]: { ...prev[p.item_code], qty: qty - 1 } };
  //   });
  // };

  const totalItems = Object.values(cart).reduce((sum, i) => sum + i.qty, 0);

  // Wishlist toggle
  const toggleLike = async (item_code) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { navigation.navigate('login'); return; }
    try {
      const res = await authPost(`${BASE_URL}/api/wishlist/toggle/`, { item_code });
      setLiked(prev => ({ ...prev, [item_code]: res.data.status === 'added' }));
    } catch {
      // silent fail
    }
  };

  // Logout
  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'username', 'refresh']);
    setCurrentUser(null);
    setShowUserMenu(false);
    navigation.navigate('login');
  };

  const cartProps = {
    cart,
    liked,
    onLike: toggleLike,
    onIncrease: increaseQty,
    onDecrease: decreaseQty,
    onInfo: setSelectedNutrition,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading StarBazar…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      {/* Reusable header component */}
      <Header totalItems={totalItems} currentUser={currentUser} onOpenUserMenu={() => setShowUserMenu(true)} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <ImageBackground source={require('../../assets/images/intro-1699564060.jpg')} style={styles.heroBanner} imageStyle={{ resizeMode: 'cover' }}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Fresh Groceries,{'\n'}Faster Checkout</Text>
            <Text style={styles.heroSub}>Shop the best quality products at great prices!</Text>
            <View style={styles.heroCats}>
              {['Home', 'Shop All', 'Contact Us'].map((c, idx) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.heroCatBtn, idx === 0 && styles.heroCatBtnActive]}
                  onPress={() => {
                    if (c === 'Shop All') navigation.navigate('all-products');
                  }}
                >
                  <Text style={[styles.heroCatText, idx === 0 && styles.heroCatTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
  </ImageBackground>

        <View style={styles.mainContainer}>
          {/* ── Best Sellers ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Sellers</Text>
            <FlatList
              data={bestSellers}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={p => p.item_code}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => (
                <View style={{ width: CARD_WIDTH }}>
                  <ProductCard p={item} {...cartProps} />
                </View>
              )}
            />
          </View>

          {/* ── Special Offers ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎉 Special Offers</Text>
            <FlatList
              data={specialOffers}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={p => p.item_code}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => (
                <View style={{ width: CARD_WIDTH + 40 }}>
                  <OfferCard
                    p={item}
                    cart={cart}
                    onIncrease={increaseQty}
                    onDecrease={decreaseQty}
                  />
                </View>
              )}
            />
          </View>

          {/* ── Shop All ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop All Products</Text>
            <View style={styles.grid}>
              {shopAllProducts.map(p => (
                <View key={p.item_code} style={styles.gridItem}>
                  <ProductCard p={p} {...cartProps} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        {/* <View style={styles.footer}>
          <Text style={styles.footerLeft}>
            © {new Date().getFullYear()} StarBazar — Fresh groceries delivered.
          </Text>
          <View style={styles.footerRight}>
            <Text style={styles.footerCompany}>StarBazar Inc.</Text>
            <Text style={styles.footerAddr}>
              123 Main Street{'\n'}New York, NY 10001{'\n'}USA
            </Text>
          </View>
        </View> */}
      </ScrollView>

      {/* ── Modals ── */}
      <NutritionModal
        product={selectedNutrition}
        visible={!!selectedNutrition}
        onClose={() => setSelectedNutrition(null)}
      />
      <UserMenu
        visible={showUserMenu}
        username={currentUser}
        onOrders={() => { setShowUserMenu(false); navigation.navigate('/orders'); }}
        onLogout={handleLogout}
        onClose={() => setShowUserMenu(false)}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
// Colors mapped from your web CSS variables
const ACCENT = '#2f8b3a';         // --accent
const ACCENT_LIGHT = '#4caf50';   // --accent-light
const MUTED = '#6b7176';          // --muted
const PAGE_BG = '#f8fafb';        // --page-bg
const BORDER_COLOR = '#e0e3e6';   // --border-color
const WHITE = '#FFFFFF';
const OFFER_ACCENT = ACCENT;      // offers also use green accents on web
const DARK = '#1A1A2E';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },

  // Loading
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: WHITE,
  },
  loadingText: {
    marginTop: 12, fontSize: 16, color: MUTED,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // Header
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
  userBtnName: { fontSize: 13, fontWeight: '600', color: ACCENT, maxWidth: 70 },
  dropdownArrow: { fontSize: 10, color: ACCENT },
  loginBtn: { backgroundColor: ACCENT_LIGHT, borderRadius: 20, paddingHorizontal: 12 },
  loginBtnText: { fontSize: 13, fontWeight: '600', color: ACCENT },

  // Hero
  heroBanner: {
    height: 220, backgroundColor: ACCENT,
    justifyContent: 'center', overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroContent: { padding: 24 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: WHITE, lineHeight: 32, marginBottom: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 16 },
  heroCats: { flexDirection: 'row', gap: 8 },
  heroCatBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  heroCatBtnActive: { backgroundColor: WHITE, borderColor: WHITE },
  heroCatText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroCatTextActive: { color: ACCENT },

  // Main
  mainContainer: { paddingBottom: 8 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: DARK,
    marginBottom: 12, paddingHorizontal: 16,
  },

  // Grid (2-column for Shop All)
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  gridItem: { width: '50%', padding: 4 },

  // Product Card
  productCard: {
    backgroundColor: WHITE, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER_COLOR,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  productImgWrap: {
    aspectRatio: 1,
    backgroundColor: PAGE_BG,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 8,
  },
  productImg: { width: '100%', height: '100%', borderRadius: 10 },
  productEmoji: { fontSize: 50 },
  infoBtn: {
    position: 'absolute', bottom: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center',
  },
  infoBtnText: { color: WHITE, fontWeight: '700', fontSize: 12, fontStyle: 'italic' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  heartBtnLiked: { backgroundColor: '#FFF0F0' },
  heartBtnText: { fontSize: 15 },
  productBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '600', color: DARK, marginBottom: 4, lineHeight: 18 },
  productPrice: { fontSize: 15, fontWeight: '700', color: ACCENT, marginBottom: 8 },
  productUnit: { fontSize: 11, fontWeight: '400', color: MUTED },

  // Add / Qty buttons
  addBtn: { backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addBtnText: { color: WHITE, fontSize: 13, fontWeight: '700' },
  addBtnDisabled: { backgroundColor: BORDER_COLOR },
  addBtnDisabledText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, overflow: 'hidden',
  },
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
  qtyBtnDisabled: { opacity: 0.4 },
  qtyValue: {
    minWidth: 44,
    height: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
    backgroundColor: 'rgba(47,139,58,0.08)',
    borderRadius: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },

  // Offer Card
  offerCard: {
    backgroundColor: WHITE, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER_COLOR,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, position: 'relative',
  },
  offerBadge: {
    position: 'absolute', top: 8, left: 8, zIndex: 10,
    backgroundColor: OFFER_ACCENT, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  offerBadgeText: { color: WHITE, fontSize: 10, fontWeight: '700' },
  offerImgWrap: {
    aspectRatio: 1,
    maxHeight: 160,
    backgroundColor: PAGE_BG,
    justifyContent: 'center', alignItems: 'center',
    padding: 8,
  },
  offerImg: { width: '100%', height: '100%', borderRadius: 10 },
  offerBody: { padding: 12 },
  offerName: { fontSize: 14, fontWeight: '600', color: DARK, marginBottom: 4 },
  originalPrice: { fontSize: 16, fontWeight: '700', color: ACCENT, marginBottom: 2 },
  offerTitle: { fontSize: 12, color: OFFER_ACCENT, fontWeight: '600', marginBottom: 8 },

  // Nutrition Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: WHITE, borderRadius: 20, width: '100%', maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: DARK, flex: 1 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, color: MUTED },
  modalImgContainer: {
    height: 260, backgroundColor: PAGE_BG,
    justifyContent: 'center', alignItems: 'center',
  },
  modalImg: { width: '90%', height: '90%' },
  imageLabelWrap: {
    position: 'absolute', bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  imageLabel: { color: WHITE, fontSize: 12 },
  modalFooter: {
    padding: 16, borderTopWidth: 1, borderTopColor: BORDER_COLOR, gap: 12,
  },
  imageNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 16,
  },
  navArrowBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: WHITE, borderWidth: 1, borderColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  navArrowText: { fontSize: 22, color: '#000', fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BORDER_COLOR },
  dotActive: { backgroundColor: ACCENT, width: 22 },
  doneBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  doneBtnText: { color: WHITE, fontSize: 15, fontWeight: '700' },

  // User Menu Modal
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 70, paddingRight: 16,
  },
  userMenu: {
    backgroundColor: WHITE, borderRadius: 14, minWidth: 180, overflow: 'hidden',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  userMenuName: { padding: 14, fontSize: 14, fontWeight: '700', color: DARK },
  menuDivider: { height: 1, backgroundColor: BORDER_COLOR },
  menuItem: { padding: 14 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: DARK },
  menuItemLogout: { color: '#D32F2F' },

  // Footer
  footer: {
    backgroundColor: DARK, padding: 20, marginTop: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  footerLeft: { color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 },
  footerRight: { alignItems: 'flex-end' },
  footerCompany: { color: WHITE, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  footerAddr: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'right', lineHeight: 17 },
});