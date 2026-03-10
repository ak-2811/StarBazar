// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, ImageBackground, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Header from '../../components/header';

const BASE_URL = 'http://localhost:8000';

export default function SignupScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', agreeTerms: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setError('');

    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.agreeTerms) {
      setError('Please agree to the Terms of Service');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/signup/`, {
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      const data = res.data;
      if (data.token) await AsyncStorage.setItem('token', data.token);
      if (data.refresh) await AsyncStorage.setItem('refresh', data.refresh);
      await AsyncStorage.setItem('username', formData.fullName);

      // After signup, navigate to Login screen inside tabs
      navigation.navigate('Login');
    } catch (err) {
      console.log('Signup error', err?.response?.data || err.message || err);
      setError(err?.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const bg = require('../../assets/images/188479114-healthy-food-assortment-on-light-background-diet-concept-top-view-flat-lay.jpg');
  const { width, height } = Dimensions.get('window');

  return (
    <SafeAreaView style={styles.root}>
      <ImageBackground source={bg} style={[styles.bg, { width, height }]} resizeMode="cover">
        <View style={styles.bgOverlay} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Header />
          <View style={styles.center}>
            <View style={styles.container}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join StarBazar for fresh groceries</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TextInput value={formData.fullName} onChangeText={(v) => handleChange('fullName', v)} placeholder="Full name" style={styles.input} placeholderTextColor="#6b7176" />
              <TextInput value={formData.email} onChangeText={(v) => handleChange('email', v)} placeholder="Email address" style={styles.input} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#6b7176" />
              <TextInput value={formData.password} onChangeText={(v) => handleChange('password', v)} placeholder="Password" style={styles.input} secureTextEntry placeholderTextColor="#6b7176" />
              <TextInput value={formData.confirmPassword} onChangeText={(v) => handleChange('confirmPassword', v)} placeholder="Confirm password" style={styles.input} secureTextEntry placeholderTextColor="#6b7176" />

              <View style={styles.termsRow}>
                <Switch value={formData.agreeTerms} onValueChange={(v) => handleChange('agreeTerms', v)} thumbColor={formData.agreeTerms ? '#2f8b3a' : undefined} />
                <Text style={styles.termsText}> I agree to the Terms of Service and Privacy Policy</Text>
              </View>

              <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign Up</Text>}
              </TouchableOpacity>

              <View style={styles.row}> 
                <Text style={styles.small}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={[styles.small, styles.link]}>Login here</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

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
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  termsText: { color: '#6b7176', marginLeft: 8, flex: 1 },
});
