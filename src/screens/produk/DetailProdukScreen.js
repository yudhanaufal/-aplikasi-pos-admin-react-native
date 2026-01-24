import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import BASE_URL from '../../utils/Api';

export default function DetailProdukScreen({ route, navigation }) {
  const { id } = route.params;

  const [namaProduk, setNamaProduk] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hargaBeli, setHargaBeli] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [stok, setStok] = useState('');
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ======================
     GET DETAIL PRODUK
  ====================== */
  useEffect(() => {
    fetch(`${BASE_URL}/api/produk/${id}`)
      .then(res => res.json())
      .then(json => {
        const data = json.data;

        setNamaProduk(data.nama_produk);
        setBarcode(data.barcode);
        setHargaBeli(data.harga_beli);
        setHargaJual(data.harga_jual);
        setStok(String(data.stok));
        setImageUrl(`${BASE_URL}${data.gambar_url}`);
      })
      .catch(() => {
        Alert.alert('Error', 'Gagal mengambil data produk');
      });
  }, []);

  /* ======================
     PILIH / GANTI GAMBAR
  ====================== */
  const pilihGambar = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.didCancel) return;

      if (res.errorCode) {
        setTimeout(() => {
          Alert.alert('Error', res.errorMessage);
        }, 300);
        return;
      }

      setImage(res.assets[0]);
    });
  };

  /* ======================
     UPDATE PRODUK (PUT)
  ====================== */
  const updateProduk = async () => {
    if (!namaProduk || !hargaJual) {
      Alert.alert('Validasi', 'Nama produk dan harga jual wajib diisi');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('nama_produk', namaProduk);
    formData.append('barcode', barcode);
    formData.append('harga_beli', hargaBeli);
    formData.append('harga_jual', hargaJual);
    formData.append('stok', stok);
    formData.append('toko_id', 5);

    if (image) {
      formData.append('gambar', {
        uri: image.uri,
        name: image.fileName || 'produk.jpg',
        type: image.type,
      });
    }

    try {
      const res = await fetch(`${BASE_URL}/api/produk/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Produk berhasil diupdate', ToastAndroid.SHORT);
        } else {
          Alert.alert('Sukses', 'Produk berhasil diupdate');
        }
        navigation.goBack();
      } else {
        Alert.alert('Gagal', json.message);
      }
    } catch (err) {
      Alert.alert('Error', 'Terjadi kesalahan server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Detail Produk</Text>

      <TouchableOpacity onPress={pilihGambar} style={styles.imageBtn}>
        <Text style={styles.imageBtnText}>
          {image ? 'Ganti Gambar' : 'Pilih Gambar'}
        </Text>
      </TouchableOpacity>

      {(image || imageUrl) && (
        <Image
          source={{ uri: image ? image.uri : imageUrl }}
          style={styles.preview}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Nama Produk"
        value={namaProduk}
        onChangeText={setNamaProduk}
      />

      <TextInput
        style={styles.input}
        placeholder="Barcode"
        value={barcode}
        onChangeText={setBarcode}
      />

      <TextInput
        style={styles.input}
        placeholder="Harga Beli"
        keyboardType="numeric"
        value={hargaBeli}
        onChangeText={setHargaBeli}
      />

      <TextInput
        style={styles.input}
        placeholder="Harga Jual"
        keyboardType="numeric"
        value={hargaJual}
        onChangeText={setHargaJual}
      />
      <TextInput
        style={styles.input}
        placeholder="Stok"
        keyboardType="numeric"
        value={stok}
        editable={false}
        pointerEvents="none"  
      />

      <TouchableOpacity
        style={[styles.btnUpdate, loading && { opacity: 0.6 }]}
        onPress={updateProduk}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? 'Menyimpan...' : 'Update Produk'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ======================
   STYLE
====================== */
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  imageBtn: {
    backgroundColor: '#0d6efd',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  imageBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  btnUpdate: {
    backgroundColor: '#198754',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
