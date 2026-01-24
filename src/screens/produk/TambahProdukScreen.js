import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { getUser } from '../../utils/Storage';
import BASE_URL from '../../utils/Api';

export default function TambahProdukScreen({ navigation }) {
  const [namaProduk, setNamaProduk] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hargaBeli, setHargaBeli] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [stok, setStok] = useState('');
  const [tokoId, setTokoId] = useState(null);

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  /** ambil toko_id dari async storage */
  useEffect(() => {
    const loadUser = async () => {
      const data = await getUser();
      if (data?.user?.toko_id) {
        setTokoId(data.user.toko_id);
      } else {
        Alert.alert('Error', 'Toko tidak ditemukan');
      }
    };
    loadUser();
  }, []);

  /** pilih gambar */
  const pilihGambar = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        setImage(response.assets[0]);
      }
    );
  };

  /** submit produk */
  const submitProduk = async () => {
    if (!namaProduk || !hargaBeli || !hargaJual || !stok) {
      Alert.alert('Validasi', 'Lengkapi semua data');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nama_produk', namaProduk);
      formData.append('barcode', barcode);
      formData.append('harga_beli', hargaBeli);
      formData.append('harga_jual', hargaJual);
      formData.append('stok', stok);
      formData.append('toko_id', tokoId);

      if (image) {
        formData.append('gambar', {
          uri: image.uri,
          name: image.fileName || 'produk.jpg',
          type: image.type,
        });
      }

      const res = await fetch(`${BASE_URL}/api/produk`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const json = await res.json();

      if (json.success) {
        Alert.alert('Sukses', 'Produk berhasil ditambahkan', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Gagal', json.message || 'Gagal tambah produk');
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Terjadi kesalahan server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tambah Produk</Text>

      <TextInput
        placeholder="Nama Produk"
        style={styles.input}
        value={namaProduk}
        onChangeText={setNamaProduk}
      />

      <TextInput
        placeholder="Barcode"
        style={styles.input}
        value={barcode}
        onChangeText={setBarcode}
      />

      <TextInput
        placeholder="Harga Beli"
        style={styles.input}
        keyboardType="numeric"
        value={hargaBeli}
        onChangeText={setHargaBeli}
      />

      <TextInput
        placeholder="Harga Jual"
        style={styles.input}
        keyboardType="numeric"
        value={hargaJual}
        onChangeText={setHargaJual}
      />

      <TextInput
        placeholder="Stok"
        style={styles.input}
        keyboardType="numeric"
        value={stok}
        onChangeText={setStok}
      />

      {/* PILIH GAMBAR */}
      <TouchableOpacity style={styles.imageBtn} onPress={pilihGambar}>
        <Text style={styles.imageBtnText}>
          {image ? 'Ganti Gambar' : 'Pilih Gambar'}
        </Text>
      </TouchableOpacity>

      {image && (
        <Image
          source={{ uri: image.uri }}
          style={styles.preview}
        />
      )}

      {/* SUBMIT */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={submitProduk}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Simpan Produk</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  imageBtn: {
    backgroundColor: '#eee',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  imageBtnText: {
    fontWeight: '600',
  },
  preview: {
    width: 140,
    height: 140,
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 8,
  },
  submitBtn: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
