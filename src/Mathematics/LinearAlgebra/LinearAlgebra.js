import TopicPage from '../../components/TopicPage';

const LinearAlgebra = () => (
  <TopicPage
    subject="LinearAlgebra"
    title="Linear Algebra"
    description="From vectors to abstract and complex linear algebra."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Mathematics', to: '/home/math' }, { label: 'Linear Algebra' }]}
  />
);

export default LinearAlgebra;
