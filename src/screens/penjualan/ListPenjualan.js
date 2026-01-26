import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Animated
} from 'react-native';
import { getUser } from '../../utils/Storage';
import BASE_URL from '../../utils/Api';

export default function ListPenjualanScreen({ navigation }) {
  const [tokoId, setTokoId] = useState(null);
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /* =========================
     LOAD USER & TOKO ID
  ========================= */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getUser();
        if (user?.user?.toko_id) {
          setTokoId(user.user.toko_id);
        } else {
          setError('Toko ID tidak ditemukan');
        }
      } catch (err) {
        setError('Gagal memuat data user');
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  /* =========================
     FETCH TRANSAKSI
  ========================= */
  const fetchTransaksi = async (pageNumber = 1) => {
    if (loading || !tokoId || pageNumber > totalPage) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/transaksi/toko/${tokoId}?page=${pageNumber}`
      );
      const json = await res.json();

      setData(prev =>
        pageNumber === 1 ? json.data : [...prev, ...json.data]
      );

      setPage(json.pagination.page);
      setTotalPage(json.pagination.totalPage);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =========================
     LOAD PERTAMA KALI
  ========================= */
  useEffect(() => {
    if (tokoId) {
      fetchTransaksi(1);
    }
  }, [tokoId]);

  /* =========================
     LOAD NEXT PAGE (INFINITE)
  ========================= */
  const loadMore = () => {
    if (page < totalPage && !loading) {
      fetchTransaksi(page + 1);
    }
  };

  /* =========================
     REFRESH
  ========================= */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransaksi(1);
  }, [tokoId]);

  /* =========================
     RENDER ITEM
  ========================= */
  const renderItem = ({ item, index }) => {
    // Hitung nomor urut berdasarkan halaman saat ini
    const nomorUrut = ((page - 1) * 10) + (index + 1);
    
    // Fungsi untuk menentukan warna status
    const getStatusColor = (status) => {
      switch(status?.toLowerCase()) {
        case 'cancel': return '#ef4444';
        case 'pending': return '#f59e0b';
        case 'success': return '#10b981';
        case 'completed': return '#10b981';
        default: return '#3b82f6';
      }
    };

    const getStatusBg = (status) => {
      switch(status?.toLowerCase()) {
        case 'cancel': return '#fee2e2';
        case 'pending': return '#fef3c7';
        case 'success': return '#d1fae5';
        case 'completed': return '#d1fae5';
        default: return '#dbeafe';
      }
    };

    return (
      <View style={styles.itemContainer}>
        {/* Nomor urut dengan design modern */}
        <View style={styles.nomorContainer}>
          <Text style={styles.nomorText}>{nomorUrut}</Text>
        </View>

        {/* Card transaksi dengan design modern */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('DetailPenjualan', {
              transaksiId: item.id,
              invoice: item.Invoice,
              status: item.Status
            })
          }
          activeOpacity={0.7}
        >
          {/* Header section */}
          <View style={styles.cardHeader}>
            <View style={styles.invoiceSection}>
              <Text style={styles.invoiceLabel}>INVOICE</Text>
              <Text style={styles.invoice}>{item.Invoice}</Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.Status) }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.Status) }]} />
              <Text style={[styles.status, { color: getStatusColor(item.Status) }]}>
                {item.Status}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Detail section */}
          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Member</Text>
              <Text style={styles.detailValue}>{item.Member || '-'}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kasir</Text>
              <Text style={styles.detailValue}>{item.Kasir}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                Rp {Number(item.Total).toLocaleString('id-ID')}
              </Text>
            </View>
          </View>

          {/* Footer section */}
          <View style={styles.cardFooter}>
            <Text style={styles.date}>
              📅 {new Date(item.Tanggal).toLocaleString('id-ID', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  /* =========================
     RENDER HEADER
  ========================= */
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerNomor}>
        <Text style={styles.headerText}>NO</Text>
      </View>
      <View style={styles.headerContent}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>TRANSAKSI</Text>
          <Text style={styles.headerText}>STATUS</Text>
        </View>
      </View>
    </View>
  );

  /* =========================
     RENDER FOOTER
  ========================= */
  const renderFooter = () => {
    if (loading && page > 1) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.footerText}>Memuat data...</Text>
        </View>
      );
    }
    
    if (page < totalPage && data.length > 0) {
      return (
        <View style={styles.footerHint}>
          <Text style={styles.footerHintText}>Swipe untuk memuat lebih banyak</Text>
        </View>
      );
    }
    
    if (data.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>✔️ Semua transaksi telah dimuat</Text>
        </View>
      );
    }
    
    return null;
  };

  /* =========================
     LOADING & ERROR
  ========================= */
  if (loadingUser) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Memuat data toko...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoadingUser(true);
              getUser().then(user => {
                if (user?.user?.toko_id) {
                  setTokoId(user.user.toko_id);
                }
                setLoadingUser(false);
              });
            }}
          >
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#8b5cf6']}
            tintColor="#8b5cf6"
          />
        }
        ListHeaderComponent={data.length > 0 ? renderHeader : null}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
              <Text style={styles.emptySubtitle}>
                Transaksi yang Anda buat akan muncul di sini
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerNomor: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#475569',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Item Container
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },

  // Nomor Urut
  nomorContainer: {
    width: 48,
    alignItems: 'center',
    marginTop: 8,
  },
  nomorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8b5cf6',
    backgroundColor: '#f5f3ff',
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderWidth: 2,
    borderColor: '#ede9fe',
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  
  // Card Header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceSection: {
    flex: 1,
  },
  invoiceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  invoice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  
  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  
  // Detail Section
  detailSection: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  
  // Card Footer
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  
  // Loading State
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Error State
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Footer Loader
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  
  // Footer Hint
  footerHint: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerHintText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  
  // Footer End
  footerEnd: {
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
  },
  footerEndText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});