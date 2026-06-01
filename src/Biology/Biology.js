import SubjectHub from '../components/SubjectHub';

const Biology = () => (
  <SubjectHub
    title="Biology"
    description="Discover the science of life and living organisms."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Biology' }]}
    topics={[
      { to: '/home/biology/anatomy', icon: 'fas fa-brain', title: 'Anatomy', description: 'The structure and organization of living organisms.' },
      { to: '/home/biology/microbiology', icon: 'fas fa-microchip', title: 'Microbiology', description: 'The study of microscopic organisms.' },
      { to: '/home/biology/molecularBiology', icon: 'fas fa-atom', title: 'Molecular Biology', description: 'The study of molecular mechanisms necessary to life.' },
      { to: '/home/biology/physiology', icon: 'fas fa-user', title: 'Physiology', description: 'Functions and activities of living organisms and their responses to stimuli.' },
    ]}
  />
);

export default Biology;
