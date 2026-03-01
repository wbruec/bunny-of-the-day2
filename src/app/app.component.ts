import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../environments/environment';

interface PixabayHit {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  user: string;
  pageURL: string;
  tags: string;
}

interface PixabayResponse {
  hits: PixabayHit[];
  totalHits: number;
}

interface CachedBunny {
  date: string;
  imageUrl: string;
  largeImageUrl: string;
  photographer: string;
  pageUrl: string;
  tags: string;
}

const CACHE_KEY = 'bunny-of-the-day-v1';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  loading = true;
  error: string | null = null;
  bunny: CachedBunny | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const today = this.getTodayString();
    const cached = this.loadCache();

    if (cached && cached.date === today) {
      this.bunny = cached;
      this.loading = false;
      return;
    }

    this.fetchBunny(today);
  }

  private getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  private loadCache(): CachedBunny | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveCache(data: CachedBunny): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // localStorage unavailable — just skip caching
    }
  }

  private fetchBunny(today: string): void {
    const key = environment.pixabayApiKey;
    const url = `https://pixabay.com/api/?key=${key}&q=bunny+rabbit&image_type=photo&safesearch=true&per_page=50&orientation=horizontal`;

    this.http.get<PixabayResponse>(url).subscribe({
      next: (res) => {
        if (!res.hits || res.hits.length === 0) {
          this.error = 'No bunnies found. Try again later!';
          this.loading = false;
          return;
        }

        const index = this.getDayOfYear() % res.hits.length;
        const hit = res.hits[index];

        const data: CachedBunny = {
          date: today,
          imageUrl: hit.webformatURL,
          largeImageUrl: hit.largeImageURL,
          photographer: hit.user,
          pageUrl: hit.pageURL,
          tags: hit.tags
        };

        this.saveCache(data);
        this.bunny = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Pixabay API error:', err);
        this.error = 'Could not fetch today\'s bunny. Please try again later.';
        this.loading = false;
      }
    });
  }
}
