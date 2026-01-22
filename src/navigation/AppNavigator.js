import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import produkScreen from '../screens/produk/ProdukScreen'
import TambahProdukScreen from '../screens/produk/TambahProdukScreen'
import DetailProdukScreen from '../screens/produk/DetailProdukScreen'
import ReturnScreen from '../screens/ReturnScreen'
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Produk" component={produkScreen} />
      <Stack.Screen name="TambahProduk" component={TambahProdukScreen} />
      <Stack.Screen name="DetailProduk" component={DetailProdukScreen} />
      <Stack.Screen name="Return" component={ReturnScreen} />

    </Stack.Navigator>
  );
}
