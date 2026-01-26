import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl
} from 'react-native';
import { getUser } from '../../utils/Storage';
import BASE_URL from '../../utils/Api';

export default function LaporanPembelian({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tokoId, setTokoId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs untuk kontrol
  const isFetchingRef = useRef(false);
  const canLoadMoreRef = useRef(true);
  const lastCallTimeRef = useRef(0);

  // Format Rupiah
  const formatRupiah = (angka) => {
    if (angka === null || angka === undefined || angka === '') return 'Rp 0';
    const num = Number(angka);
    if (isNaN(num)) return 'Rp 0';
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Initialize
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getUser();
        if (user?.user?.toko_id) {
          console.log('Toko ID ditemukan:', user.user.toko_id);
          setTokoId(user.user.toko_id);
        } else {
          setError('Toko ID tidak ditemukan');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setError('Gagal memuat data pengguna');
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Fetch data function - SIMPLIFIED VERSION
  const fetchData = useCallback(async (page = 1, isRefreshing = false) => {
    if (!tokoId) {
      console.log('Skip fetch: tokoId belum tersedia');
      return;
    }

    // Cegah multiple calls
    if (isFetchingRef.current) {
      console.log('Skip fetch: sedang fetching');
      return;
    }

    // Debounce manual: minimal 500ms antar calls
    const now = Date.now();
    if (now - lastCallTimeRef.current < 500) {
      console.log('Skip fetch: terlalu cepat');
      return;
    }
    
    lastCallTimeRef.current = now;
    isFetchingRef.current = true;

    console.log(`🚀 FETCHING PAGE ${page} untuk toko ${tokoId}`);

    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const url = `${BASE_URL}/api/pembelian/toko/${tokoId}?page=${page}&limit=10`;
      console.log('URL:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      console.log(`📦 RESPONSE PAGE ${page}:`, {
        hasData: !!json.data,
        dataType: typeof json.data,
        isArray: Array.isArray(json.data),
        keys: json.data ? Object.keys(json.data) : 'no data',
        pagination: json.data?.pagination || json.pagination
      });

      // DEBUG: Log struktur lengkap
      console.log('Full response structure:', JSON.stringify(json, null, 2).substring(0, 500) + '...');

      // Ekstrak data berdasarkan struktur yang ada
      let items = [];
      let paginationInfo = {};

      // Struktur 1: { data: { data: [], pagination: {} } }
      if (json.data && json.data.data && Array.isArray(json.data.data)) {
        items = json.data.data;
        paginationInfo = json.data.pagination || {};
        console.log('✅ Struktur: data.data dengan pagination');
      }
      // Struktur 2: { data: [] } langsung array
      else if (json.data && Array.isArray(json.data)) {
        items = json.data;
        paginationInfo = json.pagination || {};
        console.log('✅ Struktur: data langsung array');
      }
      // Struktur 3: { data: { rows: [] } }
      else if (json.data && json.data.rows && Array.isArray(json.data.rows)) {
        items = json.data.rows;
        paginationInfo = json.data;
        console.log('✅ Struktur: data.rows');
      }
      // Struktur 4: response langsung array
      else if (Array.isArray(json)) {
        items = json;
        paginationInfo = { page, total: json.length };
        console.log('✅ Struktur: response langsung array');
      }
      else {
        console.warn('⚠️ Struktur response tidak dikenali:', json);
        items = [];
        paginationInfo = {};
      }

      console.log(`📊 Page ${page}: ${items.length} items loaded`);

      // Update data state
      if (page === 1) {
        console.log(`🔄 Set data baru (page 1): ${items.length} items`);
        setData(items);
      } else {
        // Cegah duplikasi
        const existingIds = new Set(data.map(item => item.id));
        const newItems = items.filter(item => !existingIds.has(item.id));
        
        console.log(`🔄 Adding ${newItems.length} new items to existing ${data.length}`);
        
        if (newItems.length > 0) {
          setData(prev => [...prev, ...newItems]);
        } else {
          console.log('⚠️ Tidak ada data baru, kemungkinan duplikat');
        }
      }

      // Update pagination
      const currentPageNum = paginationInfo.page || page;
      const totalItemsNum = paginationInfo.total || 0;
      const totalPagesNum = paginationInfo.totalPages || Math.ceil(totalItemsNum / 10) || 1;
      const hasMoreData = currentPageNum < totalPagesNum;

      console.log(`📈 Pagination update:`, {
        currentPage: currentPageNum,
        totalPages: totalPagesNum,
        totalItems: totalItemsNum,
        hasMore: hasMoreData,
        itemsThisPage: items.length
      });

      setCurrentPage(currentPageNum);
      setTotalPages(totalPagesNum);
      setTotalItems(totalItemsNum);
      setHasMore(hasMoreData);
      canLoadMoreRef.current = hasMoreData;

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setError(`Gagal memuat data: ${error.message}`);
      
      if (page === 1) {
        setData([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      isFetchingRef.current = false;
      console.log(`✅ Finished fetching page ${page}`);
    }
  }, [tokoId, data]);

  // Initial fetch
  useEffect(() => {
    if (tokoId && loading) {
      console.log('🎯 Initial fetch triggered');
      fetchData(1);
    }
  }, [tokoId, loading, fetchData]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh');
    fetchData(1, true);
  }, [fetchData]);

  // Handle load more - FIXED VERSION
  const loadMore = useCallback(() => {
    console.log('⬇️ Load more triggered', {
      loadingMore,
      hasMore,
      canLoadMore: canLoadMoreRef.current,
      currentPage,
      totalPages
    });

    // Validasi
    if (loadingMore || !hasMore || !canLoadMoreRef.current || isFetchingRef.current) {
      console.log('⏸️ Load more skipped');
      return;
    }

    const nextPage = currentPage + 1;
    console.log(`📥 Loading page ${nextPage}`);
    
    // Update state dulu agar tidak dipanggil lagi
    canLoadMoreRef.current = false;
    
    fetchData(nextPage);
    
    // Reset setelah 1 detik
    setTimeout(() => {
      canLoadMoreRef.current = true;
    }, 1000);
  }, [loadingMore, hasMore, currentPage, fetchData]);

  // Render footer
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#4A90E2" />
          <Text style={styles.loadingText}>Memuat halaman {currentPage + 1}...</Text>
        </View>
      );
    }
    
    if (!hasMore && data.length > 0) {
      return (
        <View style={styles.endOfList}>
          <Text style={styles.endOfListText}>✓ Semua data telah dimuat ({data.length} dari {totalItems})</Text>
        </View>
      );
    }
    
    return null;
  };

  // Render error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Gagal Memuat Data</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setLoading(true);
          setError(null);
          fetchData(1);
        }}
      >
        <Text style={styles.retryButtonText}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📄</Text>
      <Text style={styles.emptyTitle}>Tidak ada data pembelian</Text>
      <Text style={styles.emptySubtitle}>
        Mulai dengan membuat pembelian baru
      </Text>
    </View>
  );

  // Render item
  const renderItem = ({ item, index }) => {
    const displayNumber = index + 1;
    
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('DetailPembelian', {
          pembelianId: item.id,
          invoice: item.invoice
        })}
        style={styles.card}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.numberContainer}>
            <Text style={styles.numberText}>{displayNumber}</Text>
          </View>
          <View style={styles.invoiceContainer}>
            <Text style={styles.invoiceText} numberOfLines={1}>
              {item.invoice || 'No Invoice'}
            </Text>
            <View style={[
              styles.statusBadge,
              item.status === 'selesai' ? styles.statusSuccess : 
              item.status === 'pending' ? styles.statusPending : 
              styles.statusCanceled
            ]}>
              <Text style={styles.statusText}>
                {(item.status || 'PROSES').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tanggal:</Text>
            <Text style={styles.infoText}>{item.tanggal || '-'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kasir:</Text>
            <Text style={styles.infoText}>{item.user_nama || '-'}</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Item</Text>
              <Text style={styles.statValue}>{item.jumlah_item || 0}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Qty</Text>
              <Text style={styles.statValue}>{item.total_quantity || 0}</Text>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatRupiah(item.total)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.detailText}>Ketuk untuk detail →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (error && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Laporan Pembelian</Text>
        </View>
        {renderError()}
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Memuat data pembelian...</Text>
        <Text style={styles.loadingSubtext}>
          {tokoId ? `Toko ID: ${tokoId}` : 'Mengambil data toko...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Laporan Pembelian</Text>
        <Text style={styles.headerSubtitle}>
          {data.length} dari {totalItems} transaksi • Halaman {currentPage}/{totalPages}
          {hasMore && ' • Scroll ke bawah untuk memuat lebih'}
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => `pembelian-${item.id}-${item.invoice}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={true}
        // Tambah scroll event untuk debug
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
          
          if (isCloseToBottom && !loadingMore && hasMore) {
            console.log('🎯 Scroll position: Near bottom, should trigger loadMore');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  numberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  invoiceContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: '#d4edda',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusCanceled: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#155724',
  },
  cardBody: {
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e0e0e0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardFooter: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  loadingSubtext: {
    marginTop: 8,
    color: '#999',
    fontSize: 12,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 10,
  },
  endOfList: {
    alignItems: 'center',
    padding: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  endOfListText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
    color: '#ccc',
  },
  emptyTitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});