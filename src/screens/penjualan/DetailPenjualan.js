import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import BASE_URL from '../../utils/Api';

export default function DetailPenjualanScreen({ route, navigation }) {
  const { transaksiId, invoice, status } = route.params;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalItems: 0,
    totalQty: 0,
    totalAmount: 0
  });

  const fetchDetail = async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/transaksi/${transaksiId}`
      );
      const json = await res.json();
      
      // Debug log
      console.log('Data API:', json.data);
      
      // Pastikan data ada
      if (!json.data || !Array.isArray(json.data)) {
        console.log('Data tidak valid:', json);
        setData([]);
        setSummaryData({ totalItems: 0, totalQty: 0, totalAmount: 0 });
        return;
      }
      
      // Urutkan data berdasarkan ID secara ascending
      const sortedData = json.data.sort((a, b) => a.id - b.id);
      setData(sortedData);
      
      // Hitung summary
      const totalQty = sortedData.reduce((sum, item) => {
        const qty = parseInt(item.Quantity) || 0;
        return sum + qty;
      }, 0);
      
      const totalAmount = sortedData.reduce((sum, item) => {
        // Konversi ke number, pastikan bukan string
        const subtotal = typeof item.Subtotal === 'string' 
          ? parseFloat(item.Subtotal.replace(/[^0-9.-]+/g, '')) 
          : Number(item.Subtotal) || 0;
        return sum + subtotal;
      }, 0);
      
      setSummaryData({
        totalItems: sortedData.length,
        totalQty: totalQty,
        totalAmount: totalAmount
      });
      
    } catch (err) {
      console.log('Error fetch:', err);
      Alert.alert('Error', 'Gagal mengambil data transaksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, []);

  const cancelTransaksi = () => {
    Alert.alert(
      'Batalkan Penjualan',
      'Apakah Anda yakin ingin membatalkan transaksi ini?',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelLoading(true);

              const res = await fetch(
                `${BASE_URL}/api/transaksi/cancel/${transaksiId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              );

              if (!res.ok) {
                throw new Error('Gagal membatalkan transaksi');
              }

              Alert.alert('Sukses', 'Transaksi berhasil dibatalkan', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  }
                }
              ]);
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setCancelLoading(false);
            }
          }
        }
      ]
    );
  };

  const Header = () => {
    const getStatusColor = () => {
      switch(status) {
        case 'Cancel': return '#ef4444';
        case 'Pending': return '#f59e0b';
        case 'Success': return '#10b981';
        default: return '#6b7280';
      }
    };

    const getStatusBgColor = () => {
      switch(status) {
        case 'Cancel': return '#fee2e2';
        case 'Pending': return '#fef3c7';
        case 'Success': return '#d1fae5';
        default: return '#f3f4f6';
      }
    };

    return (
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Detail Penjualan</Text>
          <Text style={styles.headerInvoice}>Invoice: #{invoice}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor() }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {status}
          </Text>
        </View>
      </View>
    );
  };

  const Summary = () => {
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>📦</Text>
          </View>
          <Text style={styles.summaryValue}>{summaryData.totalItems}</Text>
          <Text style={styles.summaryLabel}>Total Items</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>🛒</Text>
          </View>
          <Text style={styles.summaryValue}>{summaryData.totalQty}</Text>
          <Text style={styles.summaryLabel}>Total Qty</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>💰</Text>
          </View>
          <Text style={styles.summaryValue}>
            Rp {summaryData.totalAmount.toLocaleString('id-ID')}
          </Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Memuat detail transaksi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }) => {
    // Format harga dengan benar
    const hargaJual = typeof item.Harga_Jual === 'string' 
      ? parseFloat(item.Harga_Jual.replace(/[^0-9.-]+/g, '')) 
      : Number(item.Harga_Jual) || 0;
    
    const subtotal = typeof item.Subtotal === 'string'
      ? parseFloat(item.Subtotal.replace(/[^0-9.-]+/g, ''))
      : Number(item.Subtotal) || 0;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemNumber}>
            <Text style={styles.numberText}>{index + 1}</Text>
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.Nama_produk}</Text>
            <View style={styles.itemMeta}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ID: {item.id}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>{item.Quantity}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Harga Satuan</Text>
              <Text style={styles.detailValue}>
                Rp {hargaJual.toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              Rp {subtotal.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const totalTransaksi = data.reduce((sum, item) => {
    const subtotal = typeof item.Subtotal === 'string'
      ? parseFloat(item.Subtotal.replace(/[^0-9.-]+/g, ''))
      : Number(item.Subtotal) || 0;
    return sum + subtotal;
  }, 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cancel Button / Status Info */}
        {status !== 'Cancel' ? (
          <TouchableOpacity
            style={[styles.cancelButton, cancelLoading && styles.cancelButtonDisabled]}
            onPress={cancelTransaksi}
            disabled={cancelLoading}
          >
            {cancelLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.cancelIcon}>✕</Text>
                <Text style={styles.cancelText}>Batalkan Transaksi</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.canceledContainer}>
            <Text style={styles.cancelIconLarge}>⚠️</Text>
            <View>
              <Text style={styles.canceledTitle}>Transaksi Dibatalkan</Text>
              <Text style={styles.canceledText}>
                Transaksi ini telah dibatalkan
              </Text>
            </View>
          </View>
        )}

        {/* Summary Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ringkasan Transaksi</Text>
          <Text style={styles.sectionSubtitle}>Data ASC by ID</Text>
        </View>
        <Summary />

        {/* Items List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detail Produk</Text>
          <Text style={styles.sectionSubtitle}>
            {data.length} item • Urut berdasarkan ID (ASC)
          </Text>
        </View>

        {/* Items List */}
        {data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>Tidak ada data produk</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

        {/* Total Akhir */}
        {data.length > 0 && (
          <View style={styles.finalTotalContainer}>
            <View style={styles.finalTotalContent}>
              <Text style={styles.finalTotalLabel}>Total Transaksi</Text>
              <Text style={styles.finalTotalValue}>
                Rp {totalTransaksi.toLocaleString('id-ID')}
              </Text>
            </View>
            <View style={styles.finalTotalNote}>
              <Text style={styles.finalTotalNoteText}>
                Termasuk {summaryData.totalItems} item
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#3b82f6',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerInvoice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cancelButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  cancelIcon: {
    color: '#fff',
    fontSize: 18,
    marginRight: 8,
    fontWeight: 'bold',
  },
  cancelIconLarge: {
    fontSize: 32,
    marginRight: 12,
  },
  cancelText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  canceledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  canceledTitle: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  canceledText: {
    color: '#dc2626',
    fontSize: 12,
    opacity: 0.8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryIconText: {
    fontSize: 20,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 12,
  },
  itemDetails: {
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  quantityBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 40,
    alignItems: 'center',
  },
  quantityText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  finalTotalContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 30,
  },
  finalTotalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  finalTotalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  finalTotalValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  finalTotalNote: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
  },
  finalTotalNoteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
  },
});