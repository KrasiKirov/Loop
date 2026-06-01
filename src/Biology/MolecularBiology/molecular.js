import TopicPage from '../../components/TopicPage';

const MolecularBiology = () => (
  <TopicPage
    subject="MolecularBiology"
    title="Molecular Biology"
    description="The study of molecular mechanisms necessary to life."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Biology', to: '/home/biology' }, { label: 'Molecular Biology' }]}
  />
);

export default MolecularBiology;
