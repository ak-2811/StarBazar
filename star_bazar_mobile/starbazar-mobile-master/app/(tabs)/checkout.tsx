// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import React, { useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Header from '../../components/header';

const BASE_URL = 'http://localhost:8000';
const FRAPPE_URL = 'http://groceryv15.localhost:8001';
const { width } = Dimensions.get('window');

const ACCENT = '#2f8b3a';
const BORDER_COLOR = '#e0e3e6';
const PAGE_BG = '#f8fafb';
const WHITE = '#FFFFFF';
const MUTED = '#6b7176';
const DARK = '#1A1A2E';

export default function CheckoutScreen() {
  const navigation = useNavigation();

  // Step: 1 = Details (Delivery + Payment merged), 2 = Review
  const [step, setStep] = useState(1);
  const { cart, increaseQty, decreaseQty, removeFromCart, clearCart } = useCart();
  // const [cartObj, setCartObj] = useState({});
  const [products, setProducts] = useState({});
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '', city: '', zipCode: '',
    cardNumber: '', cardExpiry: '', cardCVV: '', deliveryMethod: 'home', deliveryOption: 'standard', billingSame: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // load cart from AsyncStorage on mount
  useEffect(() => {
    const loadOffers = async () => {
      try {
        const offersRes = await axios.get(`${BASE_URL}/api/pricing-offers/`);
        setOffers(offersRes.data || []);
      } catch (err) {
        console.log(err);
      }
    };

    loadOffers();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {

      setLoading(true);

      const itemCodes = Object.keys(cart);

      if (!itemCodes.length) {
        setProducts({});
        setLoading(false);
        return;
      }

      try {
        const res = await axios.post(`${BASE_URL}/api/products-by-codes/`, {
          item_codes: itemCodes
        });

        const map = {};
        res.data.products.forEach(p => {
          map[p.item_code] = p;
        });

        setProducts(map);

      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [Object.keys(cart).length]);

  // useEffect(() => {
  //   AsyncStorage.getItem('cart').then(raw => {
  //     try { if (raw) setCartObj(JSON.parse(raw)); }
  //     catch (e) { setCartObj({}); }
  //   });
  // }, []);

  // fetch products and offers whenever cart changes
  // useEffect(() => {
  //   const load = async () => {
  //     setLoading(true);
  //     try {
  //       const itemCodes = Object.keys(cart);
  //       if (itemCodes.length) {
  //         const res = await axios.post(`${BASE_URL}/api/products-by-codes/`, { item_codes: itemCodes });
  //         const map = {};
  //         res.data.products.forEach(p => { map[p.item_code] = p; });
  //         setProducts(map);
  //       } else setProducts({});

  //       const offersRes = await axios.get(`${BASE_URL}/api/pricing-offers/`);
  //       setOffers(offersRes.data || []);
  //     } catch (err) {
  //       console.log('Checkout load error', err);
  //     } finally { setLoading(false); }
  //   };
  //   load();
  // }, [cart]);

  // const increaseQty = (itemCode) => {
  //   setCartObj(prev => {
  //     const next = { ...prev };
  //     if (!next[itemCode]) return prev;
  //     next[itemCode] = { ...next[itemCode], qty: (next[itemCode].qty || 0) + 1 };
  //     AsyncStorage.setItem('cart', JSON.stringify(next));
  //     return next;
  //   });
  // };

  // const decreaseQty = (itemCode) => {
  //   setCartObj(prev => {
  //     const next = { ...prev };
  //     const qty = next[itemCode]?.qty || 0;
  //     if (qty <= 1) delete next[itemCode];
  //     else next[itemCode] = { ...next[itemCode], qty: qty - 1 };
  //     AsyncStorage.setItem('cart', JSON.stringify(next));
  //     return next;
  //   });
  // };

  // const handleRemove = (itemCode) => {
  //   setCartObj(prev => {
  //     const next = { ...prev }; delete next[itemCode]; AsyncStorage.setItem('cart', JSON.stringify(next)); return next;
  //   });
  // };

  // cart array with latest product data
  const cartArr = useMemo(() => {
    return Object.values(cart).map(ci => {
      const prod = products[ci.item.item_code] || ci.item;
      return { ...ci, item: prod };
    });
  }, [cart, products]);
  // const cartArr = Object.values(cart).map(ci => {
  //   const prod = products[ci.item.item_code] || ci.item;
  //   return { ...ci, item: prod };
  // });

  const computeTotals = () => {
    let subtotal = 0;
    let tax = 0;
    cartArr.forEach(ci => {
      const rule = offers.find(o => o.item_code === ci.item.item_code);
      const originalPrice = Number(ci.item.price || 0);
      const qty = ci.qty || 0;
      let lineSubtotal = originalPrice * qty;
      if (rule) {
        const minQty = Number(rule.min_qty || 0);
        const offerUnit = Number(rule.price || 0);
        if (minQty > 0 && qty >= minQty) {
          const bundles = Math.floor(qty / minQty);
          const remaining = qty % minQty;
          lineSubtotal = bundles * (offerUnit * minQty) + remaining * originalPrice;
        }
      }
      subtotal += lineSubtotal;
      if (ci.item.food_stamp) tax += lineSubtotal * 0.02;
      else if (ci.item.non_food) tax += lineSubtotal * 0.08;
      else if (ci.item.tobacco) tax += lineSubtotal * 0.05;
    });
    const shipping = cartArr.length ? 5.99 : 0;
    const total = subtotal + tax + shipping;
    return { subtotal, tax, shipping, total };
  };

  // const { subtotal, tax, shipping, total } = computeTotals();
  const { subtotal, tax, shipping, total } = useMemo(
    () => computeTotals(),
    [cartArr, offers]
  );

  const totalItems = cartArr.reduce((s, ci) => s + (ci.qty || 0), 0);

  const isWide = width >= 700;
  const MAPS_URL = 'https://www.google.com/maps?ll=34.191441,-79.796862&z=16&t=m&hl=en-US&gl=US&mapclient=embed&cid=9352544819364101604';
  // Embed URL (used for the in-app preview via WebView). This mirrors the iframe `src` you used on web.
  const MAPS_EMBED = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3350.8891234567!2d-79.7968624!3d34.1914411!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x885567bca62ddb6d%3A0x81cae9f6181dfde4!2sStar%20Bazaar!5e0!3m2!1sen!2sus!4v1709658000000';

  // Try to require the native WebView only on native platforms. This avoids bundling
  // `react-native-webview` for the web build (which causes the UnableToResolveError).
  let NativeWebView = null;
  if (Platform.OS !== 'web') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      NativeWebView = require('react-native-webview').WebView;
    } catch (e) {
      NativeWebView = null;
      // WebView not installed — native builds will fallback to placeholder and the Open in Maps button.
      console.log('react-native-webview not available', e?.message || e);
    }
  }

  const handlePlaceOrder = async () => {
    // only final submit on step 2 (Review) in the new 2-step flow
    if (step !== 2) { setStep(2); return; }

    if (!formData.firstName || !formData.lastName || !formData.email) {
      Alert.alert('Missing info', 'Please fill name and email');
      return;
    }

    if (cartArr.length === 0) { Alert.alert('Cart empty', 'Add items before ordering'); return; }

    setSubmitting(true);
    try {
      const items = cartArr.map(ci => ({ item_code: ci.item.item_code, qty: ci.qty, name: ci.item.item_name, original_price: ci.item.price, amount: (ci.qty * Number(ci.item.price || 0)) }));
      const payload = { customer_name: `${formData.firstName} ${formData.lastName}`, email: formData.email, items, tax, order_id: Date.now().toString() };
      const res = await axios.post(`${BASE_URL}/api/create-sales-invoice/`, payload);
      const invoice = res.data?.invoice || ('ORD' + Date.now());
      setOrderNumber(invoice);
      setOrderPlaced(true);
      // await AsyncStorage.removeItem('cart');
      // setCartObj({});
      clearCart();
      setStep(1);
    } catch (err) {
      console.log('Order error', err);
      Alert.alert('Order failed', 'Could not place order');
    } finally { setSubmitting(false); }
  };

  // UI helpers (now a 2-step flow)
  const next = () => setStep(s => Math.min(2, s + 1));
  const back = () => setStep(s => Math.max(1, s - 1));
  const getItemTotal = (ci) => {
    const rule = offers.find(o => o.item_code === ci.item.item_code);

    const price = Number(ci.item.price || 0);
    const qty = ci.qty || 0;

    if (!rule) return price * qty;

    const minQty = Number(rule.min_qty || 0);
    const offerPrice = Number(rule.price || 0);

    if (qty >= minQty && minQty > 0) {
      const bundles = Math.floor(qty / minQty);
      const remaining = qty % minQty;

      return bundles * (offerPrice * minQty) + remaining * price;
    }

    return price * qty;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (orderPlaced) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.confirmTitle}>Order Confirmed 🎉</Text>
          <Text style={styles.confirmText}>Order Number: <Text style={{ fontWeight: '700' }}>{orderNumber}</Text></Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setOrderPlaced(false); navigation.navigate('Home'); }}>
            <Text style={styles.primaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render header + progress
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
  {/* Reusable header (matches Home) */}
  <Header totalItems={totalItems} onOpenUserMenu={() => {}} />

        <View style={styles.progressWrap}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Step {step} of 2</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(step / 2) * 100}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {step === 1 && (
            <View>
              {/* Top toggle for Delivery vs Pickup */}
              <View style={[styles.selectorWrap, { marginBottom: 12 }]}> 
                <TouchableOpacity style={[styles.selectorBtn, formData.deliveryMethod === 'home' && styles.selectorBtnActive]} onPress={() => setFormData(f => ({ ...f, deliveryMethod: 'home' }))}>
                  <Text style={formData.deliveryMethod === 'home' ? styles.selectorTextActive : styles.selectorText}>Home Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectorBtn, formData.deliveryMethod === 'pickup' && styles.selectorBtnActive]} onPress={() => setFormData(f => ({ ...f, deliveryMethod: 'pickup' }))}>
                  <Text style={formData.deliveryMethod === 'pickup' ? styles.selectorTextActive : styles.selectorText}>Pickup</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.section, isWide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
                <View style={{ flex: 1, marginRight: isWide ? 12 : 0 }}>
                  {/* Delivery form or Pickup card */}
                  {formData.deliveryMethod === 'home' ? (
                    <>
                      <Text style={styles.sectionTitle}>Delivery Information</Text>
                      <View style={{ flexDirection: 'row' }}>
                        <TextInput placeholder="First name" value={formData.firstName} onChangeText={t => setFormData(f => ({ ...f, firstName: t }))} style={[styles.input, { flex: 1, marginRight: 8 }]} />
                        <TextInput placeholder="Last name" value={formData.lastName} onChangeText={t => setFormData(f => ({ ...f, lastName: t }))} style={[styles.input, { flex: 1 }]} />
                      </View>
                      <TextInput placeholder="Email address" keyboardType="email-address" value={formData.email} onChangeText={t => setFormData(f => ({ ...f, email: t }))} style={styles.input} />
                      <TextInput placeholder="Phone number" keyboardType="phone-pad" value={formData.phone} onChangeText={t => setFormData(f => ({ ...f, phone: t }))} style={styles.input} />
                      <TextInput placeholder="Street address" value={formData.address} onChangeText={t => setFormData(f => ({ ...f, address: t }))} style={styles.input} />
                      <View style={{ flexDirection: 'row' }}>
                        <TextInput placeholder="City" value={formData.city} onChangeText={t => setFormData(f => ({ ...f, city: t }))} style={[styles.input, { flex: 1, marginRight: 8 }]} />
                        <TextInput placeholder="ZIP code" value={formData.zipCode} onChangeText={t => setFormData(f => ({ ...f, zipCode: t }))} style={[styles.input, { width: 120 }]} />
                      </View>

                      {/* Delivery options removed per request */}
                    </>
                  ) : (
                    <View>
                      <Text style={styles.sectionTitle}>Pickup</Text>
                      <View style={styles.pickupMapWrap}>
                        <View style={styles.mapPreview}>
                          {/* Render native WebView on iOS/Android when available. For web or when
                              `react-native-webview` isn't installed we keep a harmless placeholder
                              so the web bundle doesn't fail. */}
                          {NativeWebView ? (
                            <NativeWebView
                              originWhitelist={["*"]}
                              source={{ uri: MAPS_EMBED }}
                              style={{ flex: 1, width: '100%' }}
                              automaticallyAdjustContentInsets={false}
                            />
                          ) : (
                            <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ color: MUTED }}>Map preview</Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(MAPS_URL)}>
                          <Text style={styles.mapBtnText}>📍 View Full Map</Text>
                        </TouchableOpacity>
                        <View style={styles.pickupCardInner}>
                          <Text style={styles.cardTitle}>Star Bazaar</Text>
                          <Text style={styles.mutedText}>1603 W Palmetto St, Florence, SC 29501, USA</Text>
                          <TouchableOpacity onPress={() => Linking.openURL('tel:+18437991099')}>
                            <Text style={[styles.mutedText, { color: ACCENT, marginTop: 8 }]}>+1 (843) 799-1099</Text>
                          </TouchableOpacity>
                          <Text style={[styles.mutedText, { marginTop: 6 }]}>Mon-Sun: 10:00 AM - 8:00 PM</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, marginTop: isWide ? 0 : 28, alignSelf: 'stretch' }}>
                  <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Payment Information</Text>
                  <Text style={{ fontWeight: '700', marginTop: 6, marginBottom: 6 }}>Card Details</Text>
                  <TextInput placeholder="Card number" value={formData.cardNumber} onChangeText={t => setFormData(f => ({ ...f, cardNumber: t }))} style={styles.input} keyboardType="number-pad" />
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput placeholder="MM/YY" value={formData.cardExpiry} onChangeText={t => setFormData(f => ({ ...f, cardExpiry: t }))} style={[styles.input, { flex: 1, marginRight: 8 }]} />
                    <TextInput placeholder="CVV" value={formData.cardCVV} onChangeText={t => setFormData(f => ({ ...f, cardCVV: t }))} style={[styles.input, { width: 120 }]} keyboardType="number-pad" />
                  </View>
                  {/* Billing-address toggle removed per request */}

                  <View style={[styles.orderCard, { marginTop: 12 }]}> 
                    <View style={styles.summaryRow}><Text style={{ fontWeight: '700' }}>Total</Text><Text style={{ fontWeight: '700' }}>${total.toFixed(2)}</Text></View>
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} onPress={next}><Text style={styles.primaryBtnText}>Review Order →</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Review</Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '700' }}>Shipping Address</Text>
                <Text style={{ color: MUTED }}>{formData.firstName} {formData.lastName}</Text>
                <Text style={{ color: MUTED }}>{formData.address}</Text>
                <Text style={{ color: MUTED }}>{formData.city} • {formData.zipCode}</Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '700' }}>Payment Method</Text>
                <Text style={{ color: MUTED }}>{formData.cardNumber ? `•••• •••• •••• ${formData.cardNumber.slice(-4)}` : 'Not specified'}</Text>
              </View>

              <View style={styles.orderItemsList}>
                {cartArr.map(ci => (
                  // <View key={ci.item.item_code} style={styles.orderItemRow}>
                  //   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  //     <View style={styles.thumbSmall}>{ci.item.image ? <Image source={{ uri: `${FRAPPE_URL}/${ci.item.image}` }} style={{ width: 48, height: 48 }} resizeMode="contain" /> : <Text>🍎</Text>}</View>
                  //     <View style={{ marginLeft: 12 }}>
                  //       <Text style={{ fontWeight: '700' }}>{ci.item.item_name}</Text>
                  //       <Text style={{ color: MUTED }}>Qty: {ci.qty}</Text>
                  //     </View>
                  //   </View>
                  //   <Text style={{ color: ACCENT, fontWeight: '700' }}>${(ci.qty * Number(ci.item.price || 0)).toFixed(2)}</Text>
                  // </View>
                  <View key={ci.item.item_code} style={styles.orderItemRow}>

                    <View style={{ flexDirection: 'row', alignItems: 'center', flex:1 }}>
                      
                      <View style={styles.thumbSmall}>
                        {ci.item.image ? (
                          <Image
                            source={{ uri: `${FRAPPE_URL}/${ci.item.image}` }}
                            style={{ width: 48, height: 48 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text>🍎</Text>
                        )}
                      </View>

                      <View style={{ marginLeft: 12, flex:1 }}>
                        <Text style={{ fontWeight: '700' }}>{ci.item.item_name}</Text>

                        {/* QTY CONTROLS */}
                        <View style={{ flexDirection:'row', alignItems:'center', marginTop:6 }}>
                          
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => decreaseQty(ci.item)}
                          >
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>

                          <Text style={{ marginHorizontal:10 }}>{ci.qty}</Text>

                          <TouchableOpacity
                            style={[styles.qtyBtn, ci.qty >= ci.item.stock && { opacity: 0.4 }]}
                            // onPress={() => increaseQty(ci.item)}
                            disabled={ci.qty >= ci.item.stock}
                            onPress={() => {
                              if (ci.qty < ci.item.stock) {
                                increaseQty(ci.item);
                              }
                            }}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>

                          {/* REMOVE BUTTON */}
                          <TouchableOpacity
                            onPress={() => removeFromCart(ci.item.item_code)}
                            style={{ marginLeft:10 }}
                          >
                            <Text style={{ color:'red', fontWeight:'700' }}>✕</Text>
                          </TouchableOpacity>

                        </View>

                      </View>

                    </View>

                    <Text style={{ color: ACCENT, fontWeight: '700' }}>
                      {/* ${(ci.qty * Number(ci.item.price || 0)).toFixed(2)} */}
                      ${getItemTotal(ci).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={[styles.orderCard, { marginTop: 12 }]}> 
                <View style={styles.summaryRow}><Text>Subtotal</Text><Text>${subtotal.toFixed(2)}</Text></View>
                <View style={styles.summaryRow}><Text>Shipping</Text><Text>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</Text></View>
                <View style={styles.summaryRow}><Text>Estimated Tax</Text><Text>${tax.toFixed(2)}</Text></View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}><Text style={{ fontWeight: '700' }}>Total</Text><Text style={{ fontWeight: '700' }}>${total.toFixed(2)}</Text></View>
              </View>

              <TouchableOpacity style={[styles.placeBtn, { marginTop: 16 }]} onPress={handlePlaceOrder}><Text style={styles.placeBtnText}>Place Order - ${total.toFixed(2)}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={back}><Text style={styles.secondaryBtnText}>Back to Details</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  headerWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderColor: BORDER_COLOR },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center', marginRight: 36 },
  progressWrap: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: PAGE_BG },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: MUTED },
  qtyBtn: {
    width:28,
    height:28,
    borderRadius:6,
    borderWidth:1,
    borderColor:'#ddd',
    alignItems:'center',
    justifyContent:'center'
  },

  qtyBtnText:{
    fontWeight:'700',
    fontSize:16
  },
  progressBarBg: { height: 8, backgroundColor: '#F0F3F5', borderRadius: 8, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: ACCENT },
  section: { marginTop: 12, backgroundColor: WHITE, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: BORDER_COLOR, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: DARK },
  input: { backgroundColor: PAGE_BG, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: BORDER_COLOR, marginTop: 8 },
  primaryBtn: { backgroundColor: ACCENT, paddingVertical: 14, borderRadius: 10, marginTop: 16, alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 2 },
  primaryBtnText: { color: WHITE, fontWeight: '800', fontSize: 16 },
  secondaryBtn: { backgroundColor: '#F0F3F5', paddingVertical: 12, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  secondaryBtnText: { color: MUTED, fontWeight: '700' },
  orderCard: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryDivider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER_COLOR, backgroundColor: WHITE, alignItems: 'center' },
  tabBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  tabText: { color: DARK },
  tabTextActive: { color: WHITE, fontWeight: '700' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: BORDER_COLOR, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
  deliveryCard: { backgroundColor: 'rgba(47,139,58,0.03)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(47,139,58,0.08)', marginBottom: 8 },
  pickupCard: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER_COLOR, marginBottom: 8 },
  cardTitle: { fontWeight: '800', marginBottom: 6 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  radioRowActive: { backgroundColor: 'rgba(47,139,58,0.06)' },
  radioDot: { width: 14, height: 14, borderRadius: 8, borderWidth: 1, borderColor: BORDER_COLOR, backgroundColor: WHITE },
  radioDotActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  mutedText: { color: MUTED, marginTop: 2 },
  pickupMapWrap: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(47,139,58,0.12)', alignItems: 'center', marginBottom: 18 },
  mapPreview: { width: '100%', height: 160, backgroundColor: '#eef6ef', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  mapBtn: { backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 10 },
  mapBtnText: { color: WHITE, fontWeight: '800' },
  pickupCardInner: { backgroundColor: WHITE, padding: 12, borderRadius: 8, width: '100%', borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  selectorWrap: { flexDirection: 'row', backgroundColor: 'transparent', borderRadius: 12, overflow: 'hidden' },
  selectorBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR, backgroundColor: WHITE },
  selectorBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  selectorText: { color: DARK, fontWeight: '700' },
  selectorTextActive: { color: WHITE, fontWeight: '800' },
  orderItemsList: { marginTop: 8 },
  orderItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  thumbSmall: { width: 48, height: 48, backgroundColor: PAGE_BG, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
yValue: { minWidth: 24, textAlign: 'center', fontWeight: '700', color: DARK },
  removeText: { marginTop: 4, color: '#d64545', fontWeight: '700', fontSize: 12 },});
