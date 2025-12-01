import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/shared/Layout';
import { Home } from './Home';
import { ModelGeneratorApp } from './apps/model-generator/ModelGeneratorApp';
import { DetailGeneratorApp } from './apps/detail-generator/DetailGeneratorApp';

import { ShoeEditorApp } from './apps/shoe-editor/ShoeEditorApp';
import { ContentGeneratorApp } from './apps/content-generator/ContentGeneratorApp';
import DetailStorageApp from './apps/detail-storage/DetailStorageApp';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="model-generator" element={<ModelGeneratorApp />} />
                    <Route path="detail-generator" element={<DetailGeneratorApp />} />

                    <Route path="shoe-editor" element={<ShoeEditorApp />} />
                    <Route path="content-generator" element={<ContentGeneratorApp />} />
                    <Route path="detail-storage" element={<DetailStorageApp />} />

                    {/* Redirects for legacy/folder-structure based paths */}
                    <Route path="apps/model-generator" element={<Navigate to="/model-generator" replace />} />
                    <Route path="apps/detail-generator" element={<Navigate to="/detail-generator" replace />} />

                    <Route path="apps/shoe-editor" element={<Navigate to="/shoe-editor" replace />} />
                    <Route path="apps/content-generator" element={<Navigate to="/content-generator" replace />} />
                    <Route path="apps/detail-storage" element={<Navigate to="/detail-storage" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
