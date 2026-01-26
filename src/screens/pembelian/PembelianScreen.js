import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image
} from 'react-native';
import { getUser } from '../../utils/Storage';
import BASE_URL from '../../utils/Api';

export default function PembelianScreen() {
  const [produk, setProduk] = useState([]);
  const [detail, setDetail] = useState([]);
  const [tokoId, setTokoId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('produk');
  const [allProduk, setAllProduk] = useState([]);
  
  const isMounted = useRef(true);

  /* ======================
     CLEANUP ON UNMOUNT
  ====================== */
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /* ======================
     LOAD USER & TOKO
  ====================== */
  useEffect(() => {
    const loadUser = async () => {
      const data = await getUser();
      if (!data?.user?.id || !data?.user?.toko_id) {
        Alert.alert('Error', 'User atau toko tidak ditemukan');
        return;
      }
      setUserId(data.user.id);
      setTokoId(data.user.toko_id);
    };
    loadUser();
  }, []);

  /* ======================
     LOAD SEMUA PRODUK
  ====================== */
  const loadProduk = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (!tokoId || loading || !isMounted.current) return;

    setLoading(true);
    try {
      const url = `${BASE_URL}/api/produk/toko/${tokoId}?page=${pageNum}&limit=50`;
      console.log('Fetching produk:', url);
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!isMounted.current) return;
      
      if (pageNum === 1 || isRefresh) {
        setAllProduk(result.data || []);
        setProduk(result.data || []);
      } else {
        const newAllProduk = [...allProduk, ...(result.data || [])];
        setAllProduk(newAllProduk);
        setProduk(newAllProduk);
      }
      
      setHasMore((result.data || []).length === 50);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading produk:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Gagal mengambil produk');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [tokoId, loading, allProduk]);

  useEffect(() => {
    if (tokoId) {
      loadProduk(1, true);
    }
  }, [tokoId]);

  /* ======================
     HANDLE SEARCH FRONTEND
  ====================== */
  const handleSearch = (text) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setProduk(allProduk);
    } else {
      const filtered = allProduk.filter(item => 
        item.nama_produk?.toLowerCase().includes(text.toLowerCase())
      );
      setProduk(filtered);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && isMounted.current && searchQuery === '') {
      loadProduk(page + 1);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSearchQuery('');
    loadProduk(1, true);
  };

  /* ======================
     TAMBAH PRODUK
  ====================== */
  const tambahProduk = (item) => {
    const hargaDefault = parseFloat(item.harga_beli) || 0;
    
    setDetail(prev => {
      const index = prev.findIndex(p => p.produk_id === item.id);

      if (index !== -1) {
        const updated = [...prev];
        const currentHarga = updated[index].harga_beli !== undefined ? 
          updated[index].harga_beli : updated[index].harga_default;
        
        updated[index].quantity += 1;
        updated[index].subtotal = updated[index].quantity * currentHarga;
        return updated;
      }

      return [
        ...prev,
        {
          produk_id: item.id,
          nama_produk: item.nama_produk,
          gambar_url: item.gambar_url,
          quantity: 1,
          harga_default: hargaDefault,
          subtotal: hargaDefault
        }
      ];
    });
  };

  /* ======================
     UBAH QTY
  ====================== */
  const ubahQty = (produk_id, qty) => {
    if (qty <= 0) {
      setDetail(prev => prev.filter(item => item.produk_id !== produk_id));
      return;
    }

    setDetail(prev =>
      prev.map(item => {
        if (item.produk_id !== produk_id) return item;

        const currentHarga = item.harga_beli !== undefined ? 
          parseFloat(item.harga_beli) : parseFloat(item.harga_default);
        
        return {
          ...item,
          quantity: qty,
          subtotal: qty * currentHarga
        };
      })
    );
  };

  /* ======================
     UBAH HARGA
  ====================== */
  const ubahHarga = (produk_id, harga) => {
    const hargaNum = harga ? parseFloat(harga) : null;
    
    setDetail(prev =>
      prev.map(item => {
        if (item.produk_id !== produk_id) return item;

        const newHargaBeli = hargaNum !== null ? hargaNum : undefined;
        const currentHarga = newHargaBeli !== undefined ? 
          newHargaBeli : parseFloat(item.harga_default);
        
        return {
          ...item,
          harga_beli: newHargaBeli,
          subtotal: item.quantity * currentHarga
        };
      })
    );
  };

  const hapusItem = (produk_id) => {
    setDetail(prev => prev.filter(item => item.produk_id !== produk_id));
  };

  /* ======================
     HITUNG TOTAL
  ====================== */
  const hitungTotal = () => {
    let total = 0;
    detail.forEach(item => {
      const subtotal = parseFloat(item.subtotal) || 0;
      total += subtotal;
    });
    return total;
  };

  /* ======================
     SORTIR KERANJANG
  ====================== */
  const getSortedDetail = () => {
    return [...detail].sort((a, b) => 
      (a.nama_produk || '').localeCompare(b.nama_produk || '')
    );
  };

  /* ======================
     SUBMIT PEMBELIAN
  ====================== */
  const submitPembelian = async () => {
    if (detail.length === 0) {
      Alert.alert('Info', 'Pilih produk terlebih dahulu');
      return;
    }

    const total = hitungTotal();
    
    const payload = {
      pembelian: {
        users_id: userId,
        toko_id: tokoId,
        total: total
      },
      detail: detail.map(item => {
        const harga_beli = item.harga_beli !== undefined ? 
          parseFloat(item.harga_beli) : undefined;
        
        return {
          produk_id: item.produk_id,
          quantity: item.quantity,
          harga_beli: harga_beli,
          subtotal: parseFloat(item.subtotal)
        };
      })
    };

    console.log('Submitting pembelian:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${BASE_URL}/api/pembelian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (response.ok) {
        Alert.alert('Sukses', 'Pembelian berhasil disimpan');
        setDetail([]);
      } else {
        Alert.alert('Error', result.message || 'Gagal menyimpan pembelian');
      }
    } catch (error) {
      console.error('Error submitting pembelian:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan');
    }
  };

  /* ======================
     RENDER ITEM PRODUK DENGAN GAMBAR
  ====================== */
  const renderProdukItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => tambahProduk(item)}
      style={styles.produkItem}
    >
      {/* GAMBAR PRODUK */}
      <Image
        source={{
          uri: item.gambar_url
            ? `${BASE_URL}${item.gambar_url}`
            : 'https://via.placeholder.com/80',
        }}
        style={styles.produkImage}
        defaultSource={{ uri: 'https://via.placeholder.com/80' }}
      />
      
      <View style={styles.produkInfo}>
        <Text style={styles.produkNama}>{item.nama_produk}</Text>
        <Text style={styles.produkHarga}>
          Harga Beli: Rp {(parseFloat(item.harga_beli) || 0).toLocaleString()}
        </Text>
        {item.stok !== undefined && (
          <Text style={styles.produkStok}>
            Stok: {item.stok}
          </Text>
        )}
      </View>
      <View style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </View>
    </TouchableOpacity>
  );

  /* ======================
     RENDER ITEM KERANJANG DENGAN GAMBAR
  ====================== */
  const renderKeranjangItem = ({ item }) => {
    const currentHarga = item.harga_beli !== undefined ? 
      parseFloat(item.harga_beli) : parseFloat(item.harga_default);
    const subtotal = item.quantity * currentHarga;
    
    return (
      <View style={styles.keranjangItem}>
        <View style={styles.keranjangHeader}>
          {/* GAMBAR DI KERANJANG */}
          <Image
            source={{
              uri: item.gambar_url
                ? `${BASE_URL}${item.gambar_url}`
                : 'https://via.placeholder.com/60',
            }}
            style={styles.keranjangImage}
            defaultSource={{ uri: 'https://via.placeholder.com/60' }}
          />
          
          <View style={styles.keranjangInfo}>
            <Text style={styles.keranjangNama}>{item.nama_produk}</Text>
          </View>
          
          <TouchableOpacity onPress={() => hapusItem(item.produk_id)}>
            <Text style={styles.hapusButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.keranjangControl}>
          {/* QTY CONTROL */}
          <View style={styles.qtyControl}>
            <Text style={styles.label}>Qty:</Text>
            <View style={styles.qtyWrapper}>
              <TouchableOpacity 
                style={styles.qtyButton}
                onPress={() => ubahQty(item.produk_id, item.quantity - 1)}
              >
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                value={item.quantity.toString()}
                onChangeText={v => {
                  const qty = parseInt(v) || 0;
                  ubahQty(item.produk_id, qty);
                }}
              />
              <TouchableOpacity 
                style={styles.qtyButton}
                onPress={() => ubahQty(item.produk_id, item.quantity + 1)}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* HARGA CONTROL */}
          <View style={styles.hargaControl}>
            <Text style={styles.label}>Harga:</Text>
            <TextInput
              style={styles.hargaInput}
              keyboardType="decimal-pad"
              value={item.harga_beli !== undefined ? 
                parseFloat(item.harga_beli).toString() : ''}
              placeholder={`Default: ${(parseFloat(item.harga_default) || 0).toLocaleString()}`}
              onChangeText={v => ubahHarga(item.produk_id, v)}
            />
          </View>
        </View>

        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalText}>
            Subtotal: Rp {subtotal.toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  /* ======================
     RENDER FOOTER LOADING
  ====================== */
  const renderFooter = () => {
    if (!loading || searchQuery !== '') return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#4CAF50" />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'Produk tidak ditemukan' : 'Tidak ada produk'}
      </Text>
    </View>
  );

  const sortedDetail = getSortedDetail();
  const total = hitungTotal();

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pembelian</Text>
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'produk' && styles.activeTab]}
            onPress={() => setActiveTab('produk')}
          >
            <Text style={[styles.tabText, activeTab === 'produk' && styles.activeTabText]}>
              Produk ({produk.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'keranjang' && styles.activeTab]}
            onPress={() => setActiveTab('keranjang')}
          >
            <Text style={[styles.tabText, activeTab === 'keranjang' && styles.activeTabText]}>
              Keranjang ({detail.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        {activeTab === 'produk' && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Cari produk..."
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery !== '' && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  setProduk(allProduk);
                }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CONTENT */}
        {activeTab === 'produk' ? (
          <FlatList
            data={produk}
            keyExtractor={item => item.id.toString()}
            renderItem={renderProdukItem}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={[
              styles.listContent,
              produk.length === 0 && styles.emptyListContent
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#4CAF50']}
              />
            }
          />
        ) : (
          <View style={styles.keranjangWrapper}>
            {sortedDetail.length === 0 ? (
              <View style={styles.emptyKeranjangContainer}>
                <Text style={styles.emptyStateText}>
                  Keranjang kosong. Pilih produk terlebih dahulu.
                </Text>
              </View>
            ) : (
              <FlatList
                data={sortedDetail}
                keyExtractor={item => item.produk_id.toString()}
                renderItem={renderKeranjangItem}
                contentContainerStyle={styles.keranjangList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                  <View style={styles.footer}>
                    <View style={styles.totalContainer}>
                      <Text style={styles.totalLabel}>Total:</Text>
                      <Text style={styles.totalAmount}>
                        Rp {total.toLocaleString()}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={submitPembelian}
                    >
                      <Text style={styles.submitButtonText}>
                        SIMPAN PEMBELIAN
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 35 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearSearchText: {
    fontSize: 18,
    color: '#999',
  },
  listContent: {
    padding: 12,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  /* ======================
     STYLE PRODUK ITEM DENGAN GAMBAR
  ====================== */
  produkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  produkImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  produkInfo: {
    flex: 1,
  },
  produkNama: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  produkHarga: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  produkStok: {
    fontSize: 12,
    color: '#888',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  /* ======================
     STYLE KERANJANG ITEM DENGAN GAMBAR
  ====================== */
  keranjangWrapper: {
    flex: 1,
  },
  emptyKeranjangContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  keranjangList: {
    padding: 12,
    paddingBottom: 20,
  },
  keranjangItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  keranjangHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  keranjangImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  keranjangInfo: {
    flex: 1,
  },
  keranjangNama: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hapusButton: {
    fontSize: 20,
    color: '#ff4444',
    paddingHorizontal: 8,
    fontWeight: 'bold',
  },
  keranjangControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qtyControl: {
    flex: 1,
  },
  qtyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hargaControl: {
    flex: 1,
    marginLeft: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  hargaInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  qtyInput: {
    width: 60,
    minHeight: 44,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    textAlign: 'center',
    marginHorizontal: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  qtyButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtotalContainer: {
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  /* ======================
     FOOTER STYLE
  ====================== */
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderRadius: 8,
    elevation: 3,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    color: '#666',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});