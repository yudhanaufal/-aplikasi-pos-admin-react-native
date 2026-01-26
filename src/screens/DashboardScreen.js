import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { getUser, removeUser } from '../utils/Storage';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [userData, setUserData] = useState({
    nama: '',
    toko: '',
    role: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      const data = await getUser();
      if (data?.user) {
        setUserData({
          nama: data.user.nama_lengkap || data.user.username || '',
          toko: data.user.toko_id || '',
          role: data.user.role || 'User'
        });
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah anda yakin ingin keluar dari aplikasi?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Logout',
          style: 'destructive',
          onPress: async () => {
            await removeUser();
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  const MenuButton = ({ title, onPress, icon }) => (
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Text style={styles.menuIcon}>{icon}</Text>
      </View>
      <Text style={styles.menuText}>{title}</Text>
    </TouchableOpacity>
  );

  const menuItems = [
    { id: 1, title: 'Produk', icon: '📦', route: 'Produk' },
    { id: 2, title: 'Pembelian', icon: '🛒', route: 'Pembelian' },
    // { id: 3, title: 'Member', icon: '👥', route: null },
    { id: 4, title: 'Return', icon: '↩️', route: 'Return' },
    // { id: 5, title: 'SO Parsial', icon: '📊', route: null },
    // { id: 6, title: 'SO Full', icon: '📦', route: null },
    { id: 7, title: 'Laporan Pembelian', icon: '📈', route: 'LaporanPembelian' },
    { id: 8, title: 'Laporan Penjualan', icon: '💰', route: 'ListPenjualan' },
    // { id: 9, title: 'Laporan SO Parsial', icon: '📋', route: null },
    // { id: 10, title: 'Laporan SO Full', icon: '📑', route: null },
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.userTextContainer}>
              <Text style={styles.greeting}>Selamat datang,</Text>
              <Text style={styles.userName}>{userData.nama}</Text>
              <View style={styles.roleContainer}>
                <Text style={styles.roleText}>{userData.role}</Text>
                <Text style={styles.tokoText}> • Toko #{userData.toko}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DASHBOARD CONTENT */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Menu Utama</Text>
          <Text style={styles.sectionSubtitle}>
            Pilih menu untuk mengelola sistem
          </Text>
        </View>

        {/* MENU GRID */}
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <MenuButton
              key={item.id}
              title={item.title}
              icon={item.icon}
              onPress={() => item.route ? navigation.navigate(item.route) : null}
            />
          ))}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            POS Admin v1.2
          </Text>
          <Text style={styles.footerSubtext}>
            © 2024 All rights reserved
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: Platform.OS === 'ios' ? 50 : 25, // Manual safe area untuk iOS
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
  },
  userTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tokoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    marginLeft: 10,
  },
  logoutIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  logoutText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  sectionHeader: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: width / 2 - 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});