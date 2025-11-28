import React from 'react';
import { Card } from '../../components/UI.jsx';

export const HelpView = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Central de Ajuda</h2>
            <Card>
                <h3 className="font-bold text-lg mb-4 text-azuri-800">Guia do Sistema</h3>
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">📊 Resumo</h4>
                        <p className="text-sm text-gray-600">Visão geral com gráficos de receitas, despesas e atalhos.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">👥 Clientes</h4>
                        <p className="text-sm text-gray-600">Gerencie seus clientes, histórico de anamnese e galeria de fotos.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">✂️ Serviços & Pacotes</h4>
                        <p className="text-sm text-gray-600">Cadastre seus serviços e crie pacotes promocionais.</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">📦 Produtos</h4>
                        <p className="text-sm text-gray-600">Controle de estoque e venda de produtos.</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};
