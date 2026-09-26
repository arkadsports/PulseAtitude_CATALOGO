import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import './styles.css';
import { CatalogProvider } from './lib/catalog';
import Layout from './components/Layout';
import Home from './pages/Home';
import { BrandPage, BrandsPage, CatalogPage, CategoryPage, SearchPage } from './pages/Lists';
import ProductPage from './pages/ProductPage';

/** Trocar de página volta ao topo — menos filtrar, que fica na mesma tela. */
function SubirAoTrocarDePagina() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

// Rotas do site:
//   /                     início — campanha, marcas e novidades
//   /catalogo             tudo, com busca e filtros
//   /marca/:slug          catálogo travado numa marca
//   /categoria/:slug      running, training ou casual
//   /marcas               vitrine das marcas
//   /produto/:id          galeria, tamanhos e pedido
//   /busca?q=             busca
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogProvider>
      <BrowserRouter>
        <SubirAoTrocarDePagina />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalogo" element={<CatalogPage />} />
            <Route path="marcas" element={<BrandsPage />} />
            <Route path="marca/:slug" element={<BrandPage />} />
            <Route path="categoria/:slug" element={<CategoryPage />} />
            <Route path="produto/:id" element={<ProductPage />} />
            <Route path="busca" element={<SearchPage />} />
            <Route
              path="*"
              element={<p className="py-24 text-center text-nevoa">Página não encontrada.</p>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </CatalogProvider>
  </StrictMode>,
);
