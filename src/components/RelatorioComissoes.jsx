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
    profRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#FFFBEB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    profName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#92400E',
    },
    commissionBadge: {
        backgroundColor: '#FFFFFF',
        color: '#B45309',
        padding: '4 8',
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    emptyState: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 14,
        marginTop: 40,
    },
    note: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
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

const RelatorioComissoes = ({ profissionais = [] }) => {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.header}>Comissões - Relatório</Text>

                    <View style={{ marginTop: 20 }}>
                        {profissionais.length > 0 ? (
                            <>
                                {profissionais.map((prof, index) => (
                                    <View key={index} style={styles.profRow}>
                                        <Text style={styles.profName}>{prof.name}</Text>
                                        <Text style={styles.commissionBadge}>{prof.commission || 0}%</Text>
                                    </View>
                                ))}
                                <Text style={styles.note}>
                                    Comissões baseadas na configuração de cada profissional.
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.emptyState}>Nenhum profissional cadastrado.</Text>
                        )}
                    </View>
                </View>

                <Text style={styles.footer}>Gerado pelo Sistema Gestor</Text>
            </Page>
        </Document>
    );
};

export default RelatorioComissoes;
