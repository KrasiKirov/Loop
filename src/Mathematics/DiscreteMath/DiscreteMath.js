import TopicPage from '../../components/TopicPage';

const DiscreteMath = () => (
  <TopicPage
    subject="DiscreteMath"
    title="Discrete Math"
    description="From simple number theory to complex discrete mathematics."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Mathematics', to: '/home/math' }, { label: 'Discrete Math' }]}
  />
);

export default DiscreteMath;
