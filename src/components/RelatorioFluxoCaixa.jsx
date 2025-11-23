import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Create styles
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    label: {
        fontSize: 14,
        color: '#374151',
    },
    value: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    income: {
        color: '#059669',
    },
    expense: {
        color: '#DC2626',
    },
    total: {
        fontSize: 16,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 2,
        borderTopColor: '#9CA3AF',
    },
    chartPlaceholder: {
        marginTop: 30,
        height: 200,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
    },
    chartText: {
        color: '#6B7280',
        fontSize: 12,
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

// Create Document Component
const RelatorioFluxoCaixa = ({ income = 18.00, expense = 6.00 }) => {
    const total = income - expense;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.section}>
                    <Text style={styles.header}>Fluxo de Caixa - Relatório</Text>

                    <View style={{ marginTop: 20 }}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Receitas</Text>
                            <Text style={[styles.value, styles.income]}>R$ {income.toFixed(2)}</Text>
                        </View>

                        <View style={styles.row}>
                            <Text style={styles.label}>Despesas</Text>
                            <Text style={[styles.value, styles.expense]}>R$ {expense.toFixed(2)}</Text>
                        </View>

                        <View style={[styles.row, styles.total]}>
                            <Text style={[styles.label, { fontWeight: 'bold' }]}>Saldo Total</Text>
                            <Text style={[styles.value, { color: total >= 0 ? '#059669' : '#DC2626' }]}>
                                R$ {total.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.chartPlaceholder}>
                        <Text style={styles.chartText}>Insira o Gráfico SVG/Imagem de Alta Resolução Aqui</Text>
                    </View>
                </View>

                <Text style={styles.footer}>Gerado pelo Sistema Gestor</Text>
            </Page>
        </Document>
    );
};

export default RelatorioFluxoCaixa;
