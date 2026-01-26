import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import BASE_URL from '../../utils/Api';

export default function DetailPembelian({ route, navigation }) {
  const { pembelianId, invoice } = route.params;
  const [detail, setDetail] = useState([]);
  const [pembelianInfo, setPembelianInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fungsi format angka ke Rupiah dengan validasi
  const formatRupiah = (angka) => {
    if (angka === null || angka === undefined) return 'Rp 0';
    
    const num = Number(angka);
    if (isNaN(num) || num === 0) return 'Rp 0';
    
    return 'Rp ' + num.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Format quantity dengan validasi
  const formatQuantity = (qty) => {
    if (qty === null || qty === undefined) return '0';
    
    const num = Number(qty);
    if (isNaN(num)) return '0';
    
    // Jika 0 atau negatif, tampilkan 0
    if (num <= 0) return '0';
    
    // Jika bilangan bulat, tampilkan tanpa desimal
    if (Number.isInteger(num)) {
      return num.toString();
    }
    
    // Jika desimal, tampilkan dengan maksimal 2 angka di belakang koma
    const rounded = Math.round(num * 100) / 100;
    return rounded.toString();
  };

  // Cek apakah item valid untuk ditampilkan
  const isValidItem = (item) => {
    // Cek apakah item memiliki data minimal
    return item && (
      item.nama_produk || 
      item.nama || 
      item.harga_beli || 
      item.quantity
    );
  };

  // Filter hanya item yang valid
  const filterValidItems = (items) => {
    return items.filter(item => isValidItem(item));
  };

  // Fetch detail pembelian
  const fetchDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/pembelian/${pembelianId}`);
      const json = await response.json();
      console.log('Full API Response:', JSON.stringify(json, null, 2));
      
      if (json.data) {
        let items = [];
        let info = {};
        
        // Debug: Tampilkan struktur data
        console.log('Data structure:', {
          isArray: Array.isArray(json.data),
          keys: Object.keys(json.data),
          dataSample: json.data[0] || json.data
        });
        
        // Cek berbagai kemungkinan struktur respons
        if (Array.isArray(json.data)) {
          // Jika respons langsung array detail
          items = json.data;
          // Ambil info dari item pertama atau dari root
          const firstItem = json.data[0] || {};
          info = {
            invoice: invoice,
            tanggal: json.tanggal || firstItem.tanggal || firstItem.created_at || 'N/A',
            user_nama: json.user_nama || firstItem.user_nama || firstItem.kasir || 'N/A',
            status: json.status || firstItem.status || 'PROSES',
            total: json.total || firstItem.total
          };
        } else if (json.data.data && Array.isArray(json.data.data)) {
          // Jika ada property data
          items = json.data.data;
          info = json.data;
        } else if (json.data.detail && Array.isArray(json.data.detail)) {
          // Jika ada property detail
          items = json.data.detail;
          info = json.data;
        } else if (json.data.items && Array.isArray(json.data.items)) {
          // Jika ada property items
          items = json.data.items;
          info = json.data;
        } else {
          // Jika json.data adalah object dengan info pembelian
          info = json.data;
          
          // Coba cari array detail di dalam object
          const possibleArrays = ['items', 'detail', 'barang', 'produk', 'data'];
          for (const key of possibleArrays) {
            if (json.data[key] && Array.isArray(json.data[key])) {
              items = json.data[key];
              break;
            }
          }
        }
        
        // Filter hanya item yang valid
        const validItems = filterValidItems(items);
        console.log('Valid items found:', validItems.length, 'of', items.length);
        
        setDetail(validItems);
        setPembelianInfo(info);
      } else {
        console.log('No data in response');
        setDetail([]);
        setPembelianInfo({
          invoice: invoice,
          tanggal: 'N/A',
          user_nama: 'N/A',
          status: 'N/A'
        });
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      Alert.alert('Error', 'Gagal memuat detail pembelian');
      setDetail([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  // Hitung total dari detail items
  const calculateTotal = () => {
    const total = detail.reduce((sum, item) => {
      const harga = Number(item.harga_beli) || 0;
      const qty = Number(item.quantity) || 0;
      const subtotal = item.subtotal || (harga * qty);
      return sum + (Number(subtotal) || 0);
    }, 0);
    
    // Jika total 0, coba ambil dari pembelianInfo
    if (total === 0 && pembelianInfo?.total) {
      return Number(pembelianInfo.total) || 0;
    }
    
    return total;
  };

  // Hitung total quantity
  const calculateTotalQuantity = () => {
    return detail.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      return sum + qty;
    }, 0);
  };

  const renderItem = ({ item, index }) => {
    // Jika item tidak valid, jangan render
    if (!isValidItem(item)) {
      return null;
    }
    
    const hargaBeli = Number(item.harga_beli) || 0;
    const quantity = Number(item.quantity) || 0;
    const subtotal = item.subtotal || (hargaBeli * quantity);
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemNumber}>
            <Text style={styles.itemNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>
              {item.nama_produk || item.nama || 'Produk tanpa nama'}
            </Text>
            <Text style={styles.itemCode}>
              SKU: {item.sku || item.kode || item.kode_produk || 'N/A'}
            </Text>
          </View>
        </View>

        {(hargaBeli > 0 || quantity > 0) && (
          <View style={styles.itemDetails}>
            <View style={styles.detailRow}>
              {hargaBeli > 0 && (
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Harga Beli</Text>
                  <Text style={styles.detailValue}>
                    {formatRupiah(hargaBeli)}
                  </Text>
                </View>
              )}
              
              {quantity > 0 && (
                <View style={styles.detailColumn}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <View style={styles.quantityContainer}>
                    <Text style={styles.quantityText}>
                      {formatQuantity(quantity)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {subtotal > 0 && (
              <View style={styles.subtotalContainer}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>
                  {formatRupiah(subtotal)}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Jika tidak ada harga dan quantity, tampilkan pesan */}
        {hargaBeli === 0 && quantity === 0 && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>Data harga/quantity tidak tersedia</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Memuat detail pembelian...</Text>
      </View>
    );
  }

  const validDetailCount = detail.filter(isValidItem).length;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      >
        {/* Header Info */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.invoiceIcon}>
              <Text style={styles.invoiceIconText}>📄</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.invoiceText}>{invoice}</Text>
              {/* <View style={[
                styles.statusBadge,
                pembelianInfo?.status === 'BATAL' ? styles.statusBatal :
                pembelianInfo?.status === 'SELESAI' ? styles.statusSelesai :
                styles.statusPending
              ]}>
                <Text style={styles.statusText}>
                  {pembelianInfo?.status || 'PROSES'}
                </Text>
              </View> */}
            </View>
          </View>

          <View style={styles.infoGrid}>
            {/* <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>📅 Tanggal</Text>
              <Text style={styles.infoValue}>
                {pembelianInfo?.tanggal || pembelianInfo?.created_at || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>👤 Kasir</Text>
              <Text style={styles.infoValue}>
                {pembelianInfo?.user_nama || pembelianInfo?.kasir || 'N/A'}
              </Text>
            </View>
             */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>📦 Total Item</Text>
              <Text style={styles.infoValue}>{validDetailCount}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>📊 Total Qty</Text>
              <Text style={styles.infoValue}>
                {formatQuantity(calculateTotalQuantity())}
              </Text>
            </View>
          </View>
        </View>

        {/* Total Pembelian */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Pembelian</Text>
          <Text style={styles.totalAmount}>
            {formatRupiah(calculateTotal())}
          </Text>
        </View>

        {/* List Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detail Barang</Text>
            <Text style={styles.sectionCount}>{validDetailCount} item</Text>
          </View>

          {validDetailCount === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>Tidak ada data barang yang valid</Text>
            </View>
          ) : (
            <FlatList
              data={detail.filter(isValidItem)}
              keyExtractor={(item, index) => 
                item.id?.toString() || 
                item.id_pembelian_detail?.toString() || 
                `item-${index}`
              }
              renderItem={renderItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Action Button */}
      {pembelianInfo?.status !== 'BATAL' && pembelianInfo?.status !== 'DIBATALKAN' && (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={batalkanPembelian}
            style={styles.batalButton}
          >
            <Text style={styles.batalButtonText}>❌ Batalkan Pembelian</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Fungsi batalkanPembelian
const batalkanPembelian = () => {
  Alert.alert(
    'Konfirmasi Pembatalan',
    `Apakah Anda yakin ingin membatalkan pembelian ini?`,
    [
      {
        text: 'Tidak',
        style: 'cancel'
      },
      {
        text: 'Ya, Batalkan',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(
              `${BASE_URL}/api/pembelian/${pembelianId}/status`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'BATAL' })
              }
            );

            const result = await response.json();
            console.log('RESPONSE BATAL:', result);

            if (!response.ok) {
              Alert.alert(
                'Gagal',
                result.message || 'Gagal membatalkan pembelian'
              );
              return;
            }

            Alert.alert(
              'Sukses',
              'Pembelian berhasil dibatalkan',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }
              ]
            );
          } catch (error) {
            console.log('ERROR BATAL:', error);
            Alert.alert('Error', 'Terjadi kesalahan koneksi');
          }
        }
      }
    ],
    { cancelable: true }
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  invoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceIconText: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  invoiceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  statusSelesai: {
    backgroundColor: '#d4edda',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusBatal: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#155724',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  totalCard: {
    backgroundColor: '#4A90E2',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemDetails: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  noDataContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  noDataText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  batalButton: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  batalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});