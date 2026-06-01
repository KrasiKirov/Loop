import TopicPage from '../../components/TopicPage';

const Biochemistry = () => (
  <TopicPage
    subject="Biochemistry"
    title="Biochemistry"
    description="The chemical processes and substances that occur in living organisms."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Chemistry', to: '/home/chemistry' }, { label: 'Biochemistry' }]}
  />
);

export default Biochemistry;
