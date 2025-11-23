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
    clientRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    clientName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
    },
    clientBadge: {
        backgroundColor: '#DBEAFE',
        color: '#1E40AF',
        padding: '4 8',
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyState: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 14,
        marginTop: 40,
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

const RelatorioMelhoresClientes = ({ clientes = [] }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.header}>Melhores Clientes - Relatório</Text>

                    <View style={{ marginTop: 20 }}>
                        {clientes.length > 0 ? (
                            clientes.map(([cliente, count], index) => (
                                <View key={index} style={styles.clientRow}>
                                    <Text style={styles.clientName}>#{index + 1} {cliente}</Text>
                                    <Text style={styles.clientBadge}>{count} agendamentos</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyState}>Nenhum dado de cliente encontrado.</Text>
                        )}
                    </View>
                </View>

                <Text style={styles.footer}>Gerado pelo Sistema Gestor</Text>
            </Page>
        </Document>
    );
};

export default RelatorioMelhoresClientes;
