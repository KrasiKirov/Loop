import SubjectHub from '../components/SubjectHub';

const Mathematics = () => (
  <SubjectHub
    title="Mathematics"
    description="Explore the universe of numbers and patterns."
    breadcrumb={[{ label: 'Home', to: '/home' }, { label: 'Mathematics' }]}
    topics={[
      { to: '/home/math/discreteMath', icon: 'fas fa-plus', title: 'Discrete Mathematics', description: 'From simple number theory to complex discrete mathematics.' },
      { to: '/home/math/calculus', icon: 'fas fa-calculator', title: 'Calculus', description: 'From single variable limits to multivariable and vector calculus.' },
      { to: '/home/math/linearAlgebra', icon: 'fas fa-equals', title: 'Linear Algebra', description: 'From vectors to abstract and complex linear algebra.' },
      { to: '/home/math/statistics', icon: 'fas fa-dice', title: 'Statistics & Probability', description: 'From elementary statistical tools to advanced probabilistic methods.' },
    ]}
  />
);

export default Mathematics;
