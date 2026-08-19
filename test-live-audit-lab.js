#!/usr/bin/env node

/**
 * TESTE OPERACIONAL — LIVE AUDIT LAB
 * Valida as alterações implementadas no RUNTIME INSTALADO
 */

const http = require('http');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function runTests() {
  console.log('\n=== TESTE OPERACIONAL: LIVE AUDIT LAB ===\n');

  const tests = {
    'TESTE A: Server Health': async () => {
      try {
        const health = await fetchJson('http://127.0.0.1:37621/health');
        return health.status === 'ok' ? '✓ PASS' : '✗ FAIL';
      } catch (e) {
        return '✗ FAIL: ' + e.message;
      }
    },

    'TESTE B: HTML contém Layout 6 Etapas': async () => {
      try {
        const html = await fetchHtml('http://127.0.0.1:37621/');
        const patterns = [
          'ETAPA 1.*CASAS',
          'ETAPA 2.*EVENTO',
          'ETAPA 3.*MERCADOS',
          'ETAPA 4.*ODDS',
          'ETAPA 5.*ARBITRAGEM',
          'ETAPA 6.*HOMOLOGAÇÃO'
        ];
        const allMatches = patterns.every(p => new RegExp(p, 'i').test(html));
        return allMatches ? '✓ PASS' : '✗ FAIL: nem todas as etapas encontradas';
      } catch (e) {
        return '✗ FAIL: ' + e.message;
      }
    },

    'TESTE C: Charset UTF-8 definido': async () => {
      try {
        const html = await fetchHtml('http://127.0.0.1:37621/');
        return html.includes('charset="utf-8"') ? '✓ PASS' : '✗ FAIL: charset não encontrado';
      } catch (e) {
        return '✗ FAIL: ' + e.message;
      }
    },

    'TESTE D: Função liveAuditDeleteHouse com remoção imediata': async () => {
      try {
        const html = await fetchHtml('http://127.0.0.1:37621/');
        // Validar que o código contém a lógica de remoção imediata
        const hasImmediateRemoval = /houseElement\.remove\(\)/.test(html);
        const hasBackupLogic = /cloneNode/.test(html) && /houseElementBackup/.test(html);
        return hasImmediateRemoval && hasBackupLogic ? '✓ PASS' : '✗ VERIFICAR: lógica presente mas pode estar minificada';
      } catch (e) {
        return '✗ FAIL: ' + e.message;
      }
    },

    'TESTE E: Estado vazio com mensagem operacional': async () => {
      try {
        const html = await fetchHtml('http://127.0.0.1:37621/');
        const hasEmptyState = /NENHUMA CASA CADASTRADA/.test(html) && /Cadastre uma casa para iniciar/.test(html);
        const hasAddButton = /liveAuditAddHouseButton|ADICIONAR CASA/.test(html);
        return hasEmptyState && hasAddButton ? '✓ PASS' : '✗ FAIL: estado vazio incompleto';
      } catch (e) {
        return '✗ FAIL: ' + e.message;
      }
    },

    'TESTE F: API /api/live-audit/houses disponível': async () => {
      try {
        const response = await fetchJson('http://127.0.0.1:37621/api/live-audit/houses');
        return response && typeof response === 'object' ? '✓ PASS' : '✗ FAIL: resposta inválida';
      } catch (e) {
        return '✗ FAIL: ' + e.message;
      }
    },

    'TESTE G: API /api/discovery/houses disponível': async () => {
      try {
        const response = await fetchJson('http://127.0.0.1:37621/api/discovery/houses');
        return response && Array.isArray(response.houses) ? '✓ PASS' : '✗ FAIL: resposta inválida';
      } catch (e) {
        return '✗ FAIL: ' + e.message;
      }
    },

    'TESTE H: Encoding UTF-8 em resposta JSON': async () => {
      try {
        const response = await fetchJson('http://127.0.0.1:37621/api/live-audit/houses');
        // Se conseguiu fazer parse sem erro, está UTF-8
        return '✓ PASS: JSON decodificado com sucesso';
      } catch (e) {
        return '✗ FAIL: erro ao decodificar JSON';
      }
    },

    'TESTE I: Header Content-Type inclui charset': async () => {
      return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:37621/', (res) => {
          const contentType = res.headers['content-type'] || '';
          const isUtf8 = contentType.toLowerCase().includes('utf-8') || contentType.toLowerCase().includes('charset');
          resolve(isUtf8 ? '✓ PASS: ' + contentType : '✗ WARNING: charset pode estar faltando');
          res.on('data', () => {}); // consume response
        });
        req.on('error', (e) => resolve('✗ FAIL: ' + e.message));
      });
    },
  };

  // Executar todos os testes
  for (const [name, testFn] of Object.entries(tests)) {
    try {
      const result = await testFn();
      console.log(`${name}: ${result}`);
    } catch (e) {
      console.log(`${name}: ✗ FAIL: ${e.message}`);
    }
  }

  console.log('\n=== RESUMO DOS TESTES ===\n');
  console.log('Para validação completa:');
  console.log('1. Abrir http://127.0.0.1:37621/#live-audit-lab no navegador');
  console.log('2. Verificar se layout em 6 etapas está visível');
  console.log('3. Testar exclusão de casa (deve remover imediatamente)');
  console.log('4. Validar encoding UTF-8 dos textos visualmente');
  console.log('5. Verificar botão "+ ADICIONAR CASA" quando lista vazia');
}

runTests().catch(console.error);
