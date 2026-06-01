import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import '../subject.css';

/**
 * Shared layout for a subject hub (e.g. Mathematics) listing its topics.
 * @param {string} title - Display title.
 * @param {string} description - Short blurb.
 * @param {Array<{label: string, to?: string}>} breadcrumb - Trail items.
 * @param {Array<{to: string, icon: string, title: string, description: string}>} topics
 */
const SubjectHub = ({ title, description, breadcrumb = [], topics = [] }) => {
  return (
    <div className="subject-page">
      <Helmet>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
      </Helmet>

      <div className="subject-head">
        <nav className="breadcrumb">
          {breadcrumb.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
            </React.Fragment>
          ))}
        </nav>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      <div className="topic-grid">
        {topics.map((topic) => (
          <Link key={topic.to} to={topic.to} className="topic-card">
            <i className={`${topic.icon} topic-icon`}></i>
            <h5>{topic.title}</h5>
            <p>{topic.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SubjectHub;
