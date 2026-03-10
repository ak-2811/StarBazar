// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, ImageBackground, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Header from '../../components/header';
const BASE_URL = 'http://localhost:8000';

export default function LoginScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/login/`, { email, password });
      const data = res.data;
      // adapt to response shape from your backend
      // store tokens and username for header
      if (data.token) await AsyncStorage.setItem('token', data.token);
      if (data.refresh) await AsyncStorage.setItem('refresh', data.refresh);
      if (data.full_name) await AsyncStorage.setItem('username', data.full_name);
      else if (data.email) await AsyncStorage.setItem('username', data.email);

      // navigate back to the app root (tabs) so header updates
      // use Expo Router to ensure we target the top-level route
      try {
        // navigate to the app's Home tab instead of the router index
        router.replace('/home');
      } catch (e) {
        // fallback to react-navigation if router is unavailable
        navigation.navigate('home');
      }
    } catch (err) {
      console.log('Login error', err?.response?.data || err.message || err);
      setError(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const bg = require('../../assets/images/188479114-healthy-food-assortment-on-light-background-diet-concept-top-view-flat-lay.jpg');
  const { width, height } = Dimensions.get('window');

  return (
  <>
    <Stack.Screen options={{ headerShown: false }} />

    <SafeAreaView style={styles.root}>
      <ImageBackground
        source={bg}
        style={[styles.bg, { width, height }]}
        resizeMode="cover"
      >
        <View style={styles.bgOverlay} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Header />

          <View style={styles.center}>
            <View style={styles.container}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue shopping fresh groceries
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email or username"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#6b7176"
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                style={styles.input}
                secureTextEntry
                placeholderTextColor="#6b7176"
              />

              <TouchableOpacity
                style={styles.btn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Login</Text>
                )}
              </TouchableOpacity>

              <View style={styles.row}>
                <Text style={styles.small}>Don't have an account?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("signup")}
                >
                  <Text style={[styles.small, styles.link]}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  </>
);
}

// Hide the default stack header/title for a clean fullscreen login UI

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafb' },
  bg: { flex: 1 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  container: { padding: 20, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingVertical: 28, width: '100%', maxWidth: 520 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6, color: '#1A1A2E' },
  subtitle: { color: '#6b7176', marginBottom: 12 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e0e3e6', marginTop: 10 },
  btn: { marginTop: 16, backgroundColor: '#2f8b3a', paddingVertical: 14, borderRadius: 10, alignItems: 'center', shadowColor: '#2f8b3a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 2 },
  btnText: { color: '#fff', fontWeight: '800' },
  error: { color: '#c0392b', marginBottom: 8 },
  small: { color: '#6b7176' },
  link: { color: '#2f8b3a', marginLeft: 8, fontWeight: '700' },
  row: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
});
