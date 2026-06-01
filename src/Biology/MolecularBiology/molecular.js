import '../Biology.css';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useQuizSettings } from '../../QuizContext';

const MolecularBiology = () => {
  const { setQuizSettings } = useQuizSettings();
  const navigate = useNavigate();

  const handleDifficultySelection = (difficulty) => {
    setQuizSettings({ subject: 'MolecularBiology', difficulty });
    navigate('/home/question2');
  };

  return (
    <div>
        <Helmet>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
        </Helmet>
        <div className="container text-center py-5">
            <h1><span className="app-title">Molecular Biology</span></h1>
            <p>The study of molecular mechanisms necessary to life.</p>
            <p>Choose a level of difficulty</p>
        </div>
        <div className="features-container icon-container">
            <div className="feature icon-difficulty" onClick={() => handleDifficultySelection('easy')} style={{ cursor: 'pointer' }}>
                <i className="fas fa-star"></i>
                <h5>Easy question</h5>
            </div>
            <div className="feature icon-difficulty" onClick={() => handleDifficultySelection('medium')} style={{ cursor: 'pointer' }}>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <h5>Medium question</h5>
            </div>
            <div className="feature icon-difficulty" onClick={() => handleDifficultySelection('hard')} style={{ cursor: 'pointer' }}>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <h5>Hard question</h5>
            </div>
        </div>
    </div>
  );
};

export default MolecularBiology;
