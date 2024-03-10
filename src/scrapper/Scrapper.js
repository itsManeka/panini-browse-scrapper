const cheerio = require('cheerio');
const axios = require('axios');

const reValorReais = new RegExp('R\\$([0-9,.]+)');
const reImagem = new RegExp('og\:image\" content\=\"(https?\:\/\/.+\.cloudfront\.net\/image\/.+FWEBP)\" \/>');
const reImagem2 = new RegExp('og\:image\" content\=\"(https?\:\/\/.+\.jpg)');
const reImagem3 = new RegExp('full\"\:\"(https?\:.+\.cloudfront\.net.+FWEBP)');

class Browser {
    constructor() {
        this.page = undefined;
        this.html = undefined;
    }

    async getPage() {
        return this.page;
    }

    async navigate(url) {
        const html = await axios.get(url);
        this.html = html.data;
        this.page = cheerio.load(this.html, null, false);
    }
    
    ajustaValor(valor) {
        try {
            valor = valor.replace(/\s/g,'');
            var result = valor.match(reValorReais);
            if (result) {
                return parseFloat(result[1].replace('.', '').replace(',', '.'));
            }
        } catch (err) {
            console.log(`Erro ao tratar valor: ${err.message}`);
        }
        
        return undefined;
    }
    
    async getItem(selector) {
        var retorno = undefined;
        try {
            const result = this.page(selector);
            if (result) {
                retorno = result.first().text().trim(); 
            }
        } catch (err) {
            console.log(`erro ao buscar o item de selector ${selector}. Erro: ${err.message}`)
        }
    
        return retorno;
    }
    
    async getDetalheProduto(item) {
        const selector = `td[data-th="${item}"]`;
        return await this.getItem(selector);
    }
    
    async getItemByClass(item) {
        const selector = `.${item}`;
        return await this.getItem(selector);
    }
    
    async getItemByPartialId(tag, item) {
        const selector = `${tag}[id*="${item}"]`;
        return await this.getItem(selector);
    }
    
    async leCampoClasse(json, campo, classe, attr=undefined) {
        const retorno = await this.getItemByClass(classe, attr);
        if (retorno) {
            json[campo] = retorno;
        }
    }
    
    async leCampoPartialId(json, campo, tag, partialId, trataValor) {
        var retorno = await this.getItemByPartialId(tag, partialId);
        
        if (trataValor) {
            if (retorno) {
                retorno = this.ajustaValor(retorno);
            }
        }
    
        if (retorno) {
            json[campo] = retorno;
        }
    }
    
    async leCampoDetalhe(json, campo, detalhe) {
        const retorno = await this.getDetalheProduto(detalhe);
        if (retorno) {
            json[campo] = retorno;
        }
    }

    async leCampoDetalheSplit(json, campo, detalhe, separador) {
        var retorno = await this.getDetalheProduto(detalhe);
        if (retorno) {
            retorno = retorno.split(separador);
            json[campo] = retorno;
        }
    }

    async leExisteEstoque(json) {
        const retorno = await this.getItemByClass('stock');
        if (retorno) {
            if (retorno.includes('Produto Indisponível') || retorno.includes('Fora de estoque')) {
                json['estoque'] = false;
                return;
            }
        }
        json['estoque'] = true;
    }

    async encontraLinkImagem(json, campo) {
        var imagem = "";
        var encontrou = false;

        var retorno = this.html.match(reImagem);
        if (retorno) {
            imagem = retorno[1];
            encontrou = true;
        }

        if (!encontrou) {
            retorno = this.html.match(reImagem2);
            if (retorno) {
                imagem = retorno[1];
                encontrou = true;
            }
        }

        if (!encontrou) {
            retorno = this.html.match(reImagem3);
            if (retorno) {
                imagem = retorno[1];
                imagem = imagem.replace(/\\/gi, "");
                encontrou = true;
            }
        }

        if (encontrou) {
            json[campo] = imagem;
        }
    }
    
    async lePagina(url) {
        var retorno = {};
    
        try {
            await this.navigate(url);
    
            await this.leCampoClasse(retorno, 'nome', 'page-title');
            await this.leCampoPartialId(retorno, 'preco', 'span', 'product-price', true);
            await this.leCampoPartialId(retorno, 'precoCapa', 'span', 'old-price', true);
            await this.encontraLinkImagem(retorno, 'imagem');
            await this.leExisteEstoque(retorno);
            await this.leCampoDetalhe(retorno, 'referencia', 'Referência');
            await this.leCampoDetalheSplit(retorno, 'autores', 'Autores', ', ');
            await this.leCampoDetalhe(retorno, 'encadernacao', 'Encadernação');
            await this.leCampoDetalhe(retorno, 'categoria', 'Categoria');
            await this.leCampoDetalhe(retorno, 'tipoPublicacao', 'Tipo de publicação');
            await this.leCampoDetalhe(retorno, 'conteudo', 'Conteúdo original');
            await this.leCampoDetalhe(retorno, 'paginas', 'Quantidade de páginas');
            await this.leCampoDetalhe(retorno, 'ano', 'Ano de publicação');
            
            retorno['link'] = url;
        } catch (err) {
            console.log(`Erro ao ler página (${url}): ${err.message}`);
            return undefined;
        }
    
        return retorno;
    }
}

module.exports = Browser