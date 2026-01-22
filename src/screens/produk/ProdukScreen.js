import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { getUser } from '../../utils/Storage';

const BASE_URL = 'http://10.0.2.2:3000';

export default function ProdukScreen({ navigation }) {
  const [produk, setProduk] = useState([]);
  const [filteredProduk, setFilteredProduk] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasMore: true,
  });

  // Fetch produk dengan pagination
  const fetchProduk = useCallback(async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const data = await getUser();

      if (!data?.user?.toko_id) {
        console.log('toko_id tidak ditemukan');
        Alert.alert('Error', 'Toko ID tidak ditemukan');
        if (!isLoadMore) setLoading(false);
        setLoadingMore(false);
        return;
      }

      const res = await fetch(
        `${BASE_URL}/api/produk/toko/${data.user.toko_id}?page=${page}&limit=${pagination.limit}`
      );

      const json = await res.json();

      if (json.success) {
        if (isLoadMore) {
          // Untuk load more, gabungkan data lama dengan baru
          setProduk(prev => [...prev, ...json.data]);
          setFilteredProduk(prev => [...prev, ...json.data]);
        } else {
          // Untuk refresh atau pertama kali, replace data
          setProduk(json.data);
          setFilteredProduk(json.data);
        }

        // Update pagination info
        setPagination(prev => ({
          ...prev,
          page: json.pagination?.page || page,
          total: json.pagination?.total || 0,
          totalPages: json.pagination?.totalPages || 0,
          hasMore: page < (json.pagination?.totalPages || 1)
        }));
      } else {
        if (!isLoadMore) {
          setProduk([]);
          setFilteredProduk([]);
        }
      }
    } catch (error) {
      console.log('ERROR FETCH PRODUK:', error);
      if (!isLoadMore) {
        Alert.alert('Error', 'Gagal memuat produk');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [pagination.limit]);

  // Load data pertama kali
  useEffect(() => {
    fetchProduk(1, false);
  }, [fetchProduk]);

  // Filter produk berdasarkan search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProduk(produk);
    } else {
      const filtered = produk.filter(item =>
        item.nama_produk.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProduk(filtered);
    }
  }, [searchQuery, produk]);

  // Handler untuk load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && pagination.hasMore) {
      const nextPage = pagination.page + 1;
      fetchProduk(nextPage, true);
    }
  }, [loadingMore, pagination.hasMore, pagination.page, fetchProduk]);

  // Handler untuk refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery('');
    fetchProduk(1, false);
  }, [fetchProduk]);

  // Komponen footer untuk loading indicator
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4361ee" />
        <Text style={styles.footerText}>Memuat produk...</Text>
      </View>
    );
  }, [loadingMore]);

  // Render item produk
  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('DetailProduk', {id: item.id })}
    >
      <Image
        source={{
          uri: item.gambar_url
            ? `${BASE_URL}${item.gambar_url}`
            : 'https://via.placeholder.com/80',
        }}
        style={styles.image}
        defaultSource={{ uri: 'https://via.placeholder.com/80' }}
      />

      <View style={styles.info}>
        <Text style={styles.nama} numberOfLines={1}>
          {item.nama_produk}
        </Text>
        
        <View style={styles.stockContainer}>
          <View style={[
            styles.stockBadge,
            { backgroundColor: item.stok > 5 ? '#d1fae5' : '#fee2e2' }
          ]}>
            <Text style={[
              styles.stockText,
              { color: item.stok > 5 ? '#065f46' : '#991b1b' }
            ]}>
              Stok: {item.stok}
            </Text>
            <Text style={styles.barcodeText}>
              Barcode: {item.barcode}
            </Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Harga Beli</Text>
            <Text style={styles.hargaBeli}>
              Rp {parseInt(item.harga_beli).toLocaleString('id-ID')}
            </Text>
          </View>
          
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Harga Jual</Text>
            <Text style={styles.hargaJual}>
              Rp {parseInt(item.harga_jual).toLocaleString('id-ID')}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => navigation.navigate('EditProduk', { produkId: item.id })}
      >
        <Text style={styles.editButtonText}>›</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [navigation]);

  // Komponen untuk empty state
  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 'Produk tidak ditemukan' : 'Belum ada produk'}
      </Text>
      {searchQuery ? (
        <Text style={styles.emptySubText}>
          Coba kata kunci lain
        </Text>
      ) : (
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => navigation.navigate('TambahProduk')}
        >
          <Text style={styles.emptyButtonText}>+ Tambah Produk</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery, navigation]);

  // Render loading screen terpisah
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Memuat produk...</Text>
      </View>
    );
  }

  // Render main content
  return (
    <View style={styles.container}>
      {/* Header dengan tombol plus */}
      <View style={styles.header}>
        <Text style={styles.title}>Daftar Produk</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('TambahProduk')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIconContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
        </View>
        <TextInput
          placeholder="Cari produk..."
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info jumlah produk */}
      <View style={styles.productInfo}>
        <Text style={styles.productCount}>
          {filteredProduk.length} produk ditemukan
          {pagination.total > 0 && ` dari ${pagination.total}`}
        </Text>
      </View>

      {/* Product List dengan Infinite Scroll */}
      <FlatList
        data={filteredProduk}
        keyExtractor={(item) => `${item.id}_${item.created_at || Date.now()}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4361ee']}
            tintColor="#4361ee"
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={filteredProduk.length === 0 && styles.flatListContent}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  addButton: {
    backgroundColor: '#4361ee',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIconContainer: {
    marginRight: 8,
  },
  searchIcon: {
    fontSize: 18,
    color: '#999',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    paddingVertical: 4,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: '300',
    marginTop: -2,
  },
  productInfo: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  productCount: {
    fontSize: 14,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    color: '#dee2e6',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#4361ee',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  flatListContent: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nama: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  stockContainer: {
    marginBottom: 8,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barcodeText: {
    fontSize: 11,
    color: '#07357f',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
  hargaBeli: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '600',
  },
  hargaJual: {
    fontSize: 14,
    color: '#198754',
    fontWeight: '600',
  },
  editButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  editButtonText: {
    fontSize: 24,
    color: '#adb5bd',
    fontWeight: '300',
    marginTop: -4,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 10,
    color: '#6c757d',
    fontSize: 14,
  },
});