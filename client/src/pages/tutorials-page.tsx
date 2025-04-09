import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { TutorialSelector } from '@/components/tutorial/tutorial-selector';
import { TutorialModal } from '@/components/tutorial/tutorial-modal';

export default function TutorialsPage() {
  return (
    <>
      <Helmet>
        <title>Tutorials | Xeno AI</title>
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="container mx-auto py-8"
      >
        <TutorialSelector />
        <TutorialModal />
      </motion.div>
    </>
  );
}