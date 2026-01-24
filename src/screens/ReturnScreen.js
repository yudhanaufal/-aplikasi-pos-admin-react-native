import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getUser } from '../utils/Storage';

import BASE_URL from '../utils/Api';

export default function ReturnScreen() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  
  // State untuk pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasMore: true,
  });

  // Fetch return dengan pagination
  const fetchReturn = useCallback(async (page = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setLoadingMore(true);

      const data = await getUser();
      console.log('STORAGE:', data);

      if (!data?.user?.toko_id) {
        console.log('toko_id tidak ditemukan');
        Alert.alert('Error', 'Toko ID tidak ditemukan');
        return;
      }

      const url = `${BASE_URL}/api/return/toko/${data.user.toko_id}?page=${page}&limit=${pagination.limit}`;
      console.log('FETCH URL:', url);

      const res = await fetch(url);
      console.log('STATUS:', res.status);

      const json = await res.json();
      console.log('RESPONSE:', json);

      if (json.success) {
        if (isLoadMore) {
          // Untuk load more, gabungkan data lama dengan baru
          setReturns(prev => [...prev, ...json.data]);
        } else {
          // Untuk refresh atau pertama kali, replace data
          setReturns(json.data);
        }

        // Update pagination info dari response
        setPagination(prev => ({
          ...prev,
          page: json.pagination?.page || page,
          total: json.pagination?.total || 0,
          totalPages: json.pagination?.totalPages || 0,
          hasMore: page < (json.pagination?.totalPages || 1)
        }));
      } else {
        Alert.alert('Error', json.message);
        if (!isLoadMore) setReturns([]);
      }

    } catch (err) {
      console.log('FETCH RETURN ERROR:', err.message);
      Alert.alert('Error', err.message);
      if (!isLoadMore) setReturns([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [pagination.limit]);

  // Load data pertama kali
  useEffect(() => {
    fetchReturn(1, false);
  }, [fetchReturn]);

  // Handler untuk refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 1, hasMore: true }));
    fetchReturn(1, false);
  }, [fetchReturn]);

  // Handler untuk load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && pagination.hasMore) {
      const nextPage = pagination.page + 1;
      fetchReturn(nextPage, true);
    }
  }, [loadingMore, pagination.hasMore, pagination.page, fetchReturn]);

  const updateStatus = async (id, status) => {
    try {
      const data = await getUser();

      await fetch(`${BASE_URL}/api/return/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_id: data.user.id
        })
      });

      Alert.alert('Sukses', `Return berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
      setModalVisible(false);
      // Refresh data dari awal
      setPagination(prev => ({ ...prev, page: 1, hasMore: true }));
      fetchReturn(1, false);

    } catch (err) {
      console.log('ERROR UPDATE STATUS:', err);
      Alert.alert('Error', 'Gagal mengupdate status return');
    }
  };

  const formatRupiah = (angka) => {
    if (!angka) return 'Rp 0';
    return `Rp ${parseInt(angka).toLocaleString('id-ID')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981'; // green
      case 'rejected': return '#ef4444'; // red
      case 'pending': return '#f59e0b'; // orange
      default: return '#6b7280'; // gray
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'pending': return 'Menunggu';
      default: return status;
    }
  };

  const formatTanggal = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Komponen footer untuk loading indicator
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4361ee" />
        <Text style={styles.footerText}>Memuat data lebih banyak...</Text>
      </View>
    );
  }, [loadingMore]);

  // Komponen untuk empty state
  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔄</Text>
      <Text style={styles.emptyText}>Belum ada data return</Text>
    </View>
  ), []);

  // Render item untuk detail produk dalam modal
  const renderDetailItem = useCallback(({ item }) => (
    <View style={styles.detailItem}>
      <Text style={styles.productName}>{item.nama_produk}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailText}>Qty: {item.quantity}</Text>
        <Text style={styles.detailText}>@ {formatRupiah(item.harga_beli)}</Text>
      </View>
      <Text style={styles.detailText}>
        Subtotal: {formatRupiah(item.subtotal)}
      </Text>
      <View style={styles.reasonContainer}>
        <Text style={styles.reasonLabel}>📝 Alasan:</Text>
        <Text style={styles.reasonText}>{item.alasan_return}</Text>
      </View>
    </View>
  ), []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Memuat data return...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daftar Return</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>
            {returns.length} dari {pagination.total} return
          </Text>
          {pagination.hasMore && returns.length > 0 && (
            <Text style={styles.headerHint}>⬇ Scroll untuk lebih banyak</Text>
          )}
        </View>
      </View>

      {/* List Return dengan Infinite Scroll */}
      <FlatList
        data={returns}
        keyExtractor={(item) => `${item.id}_${item.updated_at || ''}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4361ee']}
            tintColor="#4361ee"
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={returns.length === 0 && styles.flatListEmpty}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setSelected(item);
              setModalVisible(true);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardId}>Return #{item.id}</Text>
                {item.users_nama && (
                  <Text style={styles.cardUser}>{item.users_nama}</Text>
                )}
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) }
              ]}>
                <Text style={styles.statusText}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>📅 Tanggal:</Text>
                <Text style={styles.cardValue}>{formatTanggal(item.tanggal)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>💰 Total:</Text>
                <Text style={styles.cardTotal}>{formatRupiah(item.total)}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.viewDetail}>
                👉 Ketuk untuk detail
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* MODAL DETAIL dengan FlatList untuk items */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detail Return #{selected.id}</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.modalClose}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Gunakan FlatList untuk konten modal */}
                <FlatList
                  data={selected.details || []}
                  keyExtractor={(item) => item.id.toString()}
                  ListHeaderComponent={
                    <View style={styles.modalContent}>
                      {/* Informasi Umum */}
                      <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>Informasi Return</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Tanggal:</Text>
                          <Text style={styles.infoValue}>{formatTanggal(selected.tanggal)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Total:</Text>
                          <Text style={styles.infoValue}>{formatRupiah(selected.total)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Status:</Text>
                          <View style={[
                            styles.statusBadge,
                            styles.statusBadgeModal,
                            { backgroundColor: getStatusColor(selected.status) }
                          ]}>
                            <Text style={styles.statusText}>
                              {getStatusText(selected.status)}
                            </Text>
                          </View>
                        </View>
                        {selected.users_nama && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Pengguna:</Text>
                            <Text style={styles.infoValue}>{selected.users_nama}</Text>
                          </View>
                        )}
                      </View>

                      {/* Header untuk Detail Items */}
                      <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>
                          Items Return ({selected.details?.length || 0})
                        </Text>
                      </View>
                    </View>
                  }
                  renderItem={renderDetailItem}
                  ListFooterComponent={
                    <View style={styles.modalFooter}>
                      {/* Tombol Aksi untuk Pending */}
                      {selected.status === 'pending' && (
                        <View style={styles.actionContainer}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() => updateStatus(selected.id, 'approved')}
                          >
                            <Text style={styles.actionButtonText}>✓ Setujui Return</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => updateStatus(selected.id, 'rejected')}
                          >
                            <Text style={styles.actionButtonText}>✗ Tolak Return</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Tombol Tutup */}
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setModalVisible(false)}
                      >
                        <Text style={styles.closeButtonText}>Tutup</Text>
                      </TouchableOpacity>
                    </View>
                  }
                  contentContainerStyle={styles.modalFlatListContent}
                  showsVerticalScrollIndicator={true}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  headerInfo: {
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  headerHint: {
    fontSize: 12,
    color: '#4361ee',
    fontStyle: 'italic',
    marginTop: 4,
  },
  flatListEmpty: {
    flexGrow: 1,
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
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  cardUser: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  cardValue: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  cardTotal: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  viewDetail: {
    fontSize: 14,
    color: '#4361ee',
    fontWeight: '600',
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '300',
  },
  modalFlatListContent: {
    padding: 20,
  },
  modalContent: {
    marginBottom: 0,
  },
  modalFooter: {
    marginTop: 20,
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  statusBadgeModal: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  detailItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
  },
  reasonContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    marginRight: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4361ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});