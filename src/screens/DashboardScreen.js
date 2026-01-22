import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

import { getUser, removeUser } from '../utils/Storage';

export default function DashboardScreen({ navigation }) {
  const [nama, setNama] = useState('');
  const [toko,setToko] = useState('');


  useEffect(() => {
    const loadUser = async () => {
      const data = await getUser();
      if (data?.user?.nama_lengkap) {
        setNama(data.user.nama_lengkap);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const data = await getUser();
      if (data?.user?.toko_id) {
        setToko(data.user.toko_id);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Apakah anda yakin ingin logout?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await removeUser();
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  const MenuButton = ({ title, onPress }) => (
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <Text style={styles.menuText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.hello}>Hello , {nama}</Text>
      

        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hello}>Toko : {toko}</Text>
      <Text style={styles.title}>Dashboard admin</Text>

      {/* MENU */}
      <View style={styles.menuContainer}>
        <MenuButton
            title="Produk"
            onPress={() => navigation.navigate('Produk')}
        />
        <MenuButton title="Pembelian" />

        <MenuButton title="Member" />
        <MenuButton title="Return" />

        <MenuButton title="SO Parsial" />
        <MenuButton title="SO Full" />

        <MenuButton title="Laporan Pembelian" />
        <MenuButton title="Laporan Penjualan" />

        <MenuButton title="Laporan SO Parsial" />
        <MenuButton title="Laporan SO Full" />
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  hello: {
    fontSize: 16,
  },

  logout: {
    fontSize: 14,
    color: 'red',
    fontWeight: '600',
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 24,
  },

  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  menuButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 18,
    marginBottom: 16,

    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,

    alignItems: 'center',
  },

  menuText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
