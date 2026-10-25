import { createRoot } from 'react-dom/client';
import { motion } from 'motion/react';
createRoot(document.getElementById('radice')!).render(<motion.h1 animate={{ opacity: 1 }} initial={{ opacity: 0 }}>Prova</motion.h1>);
