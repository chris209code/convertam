'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { searchArticles } from '@/lib/learn';
import { getLearnCategory } from '@/lib/learn/categories';

// The site's one established search convention (see app/page.js's tool
// search): a controlled input + useMemo filter + dropdown results, no
// search library. Deliberately simple per product direction — searches
// title/excerpt/category only (searchArticles() in lib/learn/index.js),
// nothing more sophisticated for this release.
export default function LearnSearch() {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => searchArticles(query), [query]);

  return (
    <div className="lrn-search-wrap">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 150)}
        placeholder="Search guides — e.g. merge PDF or VAT"
        className="lrn-search-input"
        aria-label="Search Convertam Learn"
      />
      {showResults && results.length > 0 && (
        <div className="lrn-search-results">
          {results.map((article) => {
            const category = getLearnCategory(article.category);
            return (
              <Link key={article.slug} href={`/learn/${article.category}/${article.slug}`} className="lrn-search-result">
                <div>
                  <p className="lrn-search-result-title">{article.title}</p>
                  <p className="lrn-search-result-cat">{category?.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
