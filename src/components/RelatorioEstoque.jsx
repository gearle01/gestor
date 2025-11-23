import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
        color: '#111827',
        fontWeight: 'bold',
    },
    section: {
        margin: 10,
        padding: 10,
        flexGrow: 1,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    productName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#991B1B',
    },
    stockBadge: {
        backgroundColor: '#FFFFFF',
        color: '#DC2626',
        padding: '4 8',
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    healthyState: {
        textAlign: 'center',
        padding: 20,
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        marginTop: 40,
    },
    healthyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#15803D',
        marginBottom: 8,
    },
    healthyText: {
        fontSize: 12,
        color: '#15803D',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 10,
    }
});

const RelatorioEstoque = ({ produtos = [] }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.header}>Alerta de Estoque - Relatório</Text>

                    <View style={{ marginTop: 20 }}>
                        {produtos.length > 0 ? (
                            produtos.map((prod, index) => (
                                <View key={index} style={styles.productRow}>
                                    <Text style={styles.productName}>{prod.name}</Text>
                                    <Text style={styles.stockBadge}>{prod.stock} un</Text>
                                </View>
                            ))
                        ) : (
                            <View style={styles.healthyState}>
                                <Text style={styles.healthyTitle}>✓ Estoque Saudável</Text>
                                <Text style={styles.healthyText}>Nenhum produto com estoque baixo.</Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text style={styles.footer}>Gerado pelo Sistema Gestor</Text>
            </Page>
        </Document>
    );
};

export default RelatorioEstoque;
