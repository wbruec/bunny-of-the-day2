import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';

const CACHE_KEY = 'bunny-of-the-day-v1';

const makeFakeHit = (overrides: Partial<{
  id: number;
  webformatURL: string;
  largeImageURL: string;
  user: string;
  pageURL: string;
  tags: string;
}> = {}) => ({
  id: 1,
  webformatURL: 'https://example.com/web.jpg',
  largeImageURL: 'https://example.com/large.jpg',
  user: 'photographer1',
  pageURL: 'https://pixabay.com/photos/1',
  tags: 'bunny, rabbit, cute',
  ...overrides,
});

const buildExpectedUrl = () => {
  const key = environment.pixabayApiKey;
  return `https://pixabay.com/api/?key=${key}&q=bunny+rabbit&image_type=photo&safesearch=true&per_page=50&orientation=horizontal`;
};

describe('AppComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // getTodayString()
  // -------------------------------------------------------------------------
  describe('getTodayString()', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      // Prevent ngOnInit from making HTTP calls
      spyOn(localStorage, 'getItem').and.returnValue(null);
      fixture.detectChanges();
      httpMock.expectOne(buildExpectedUrl()).flush({ hits: [makeFakeHit()], totalHits: 1 });

      const result = (component as any).getTodayString() as string;
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns the current date', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      spyOn(localStorage, 'getItem').and.returnValue(null);
      fixture.detectChanges();
      httpMock.expectOne(buildExpectedUrl()).flush({ hits: [makeFakeHit()], totalHits: 1 });

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const expected = `${y}-${m}-${d}`;
      expect((component as any).getTodayString()).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  // getDayOfYear()
  // -------------------------------------------------------------------------
  describe('getDayOfYear()', () => {
    it('returns a positive integer', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      spyOn(localStorage, 'getItem').and.returnValue(null);
      fixture.detectChanges();
      httpMock.expectOne(buildExpectedUrl()).flush({ hits: [makeFakeHit()], totalHits: 1 });

      const day = (component as any).getDayOfYear() as number;
      expect(day).toBeGreaterThanOrEqual(1);
    });

    it('returns a value in the range 1–366', () => {
      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      spyOn(localStorage, 'getItem').and.returnValue(null);
      fixture.detectChanges();
      httpMock.expectOne(buildExpectedUrl()).flush({ hits: [makeFakeHit()], totalHits: 1 });

      const day = (component as any).getDayOfYear() as number;
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(366);
    });
  });

  // -------------------------------------------------------------------------
  // loadCache()
  // -------------------------------------------------------------------------
  describe('loadCache()', () => {
    it('returns null when localStorage is empty', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      // Skip ngOnInit side-effects by not calling detectChanges yet; loadCache is a pure method
      const result = (component as any).loadCache();
      expect(result).toBeNull();

      // ngOnInit will be triggered by detectChanges — flush the resulting HTTP call
      fixture.detectChanges();
      httpMock.expectOne(buildExpectedUrl()).flush({ hits: [makeFakeHit()], totalHits: 1 });
    });

    it('returns null when localStorage contains corrupt JSON', () => {
      spyOn(localStorage, 'getItem').and.returnValue('not-valid-json{{{');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      const result = (component as any).loadCache();
      expect(result).toBeNull();

      fixture.detectChanges();
      httpMock.expectOne(buildExpectedUrl()).flush({ hits: [makeFakeHit()], totalHits: 1 });
    });

    it('returns the parsed object when valid cached data exists', () => {
      const cached = {
        date: '2026-03-08',
        imageUrl: 'https://example.com/web.jpg',
        largeImageUrl: 'https://example.com/large.jpg',
        photographer: 'alice',
        pageUrl: 'https://pixabay.com/photos/1',
        tags: 'bunny',
      };
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(cached));

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      const result = (component as any).loadCache();
      expect(result).toEqual(cached);

      // ngOnInit will use the cache (date must match today for HTTP to be skipped)
      // We don't call detectChanges here to keep the test focused on loadCache alone.
    });
  });

  // -------------------------------------------------------------------------
  // saveCache()
  // -------------------------------------------------------------------------
  describe('saveCache()', () => {
    it('writes serialised data to localStorage under the correct key', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      const setItemSpy = spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const req = httpMock.expectOne(buildExpectedUrl());
      req.flush({ hits: [makeFakeHit()], totalHits: 1 });

      // setItem should have been called with the canonical cache key
      expect(setItemSpy).toHaveBeenCalledWith(CACHE_KEY, jasmine.any(String));
      const writtenValue = setItemSpy.calls.mostRecent().args[1] as string;
      const parsed = JSON.parse(writtenValue);
      expect(parsed.imageUrl).toBe('https://example.com/web.jpg');
    });

    it('writes data that round-trips through JSON correctly', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      const setItemSpy = spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;

      const bunnyData = {
        date: '2026-03-08',
        imageUrl: 'https://example.com/web.jpg',
        largeImageUrl: 'https://example.com/large.jpg',
        photographer: 'bob',
        pageUrl: 'https://pixabay.com/photos/42',
        tags: 'rabbit, cute',
      };
      (component as any).saveCache(bunnyData);

      expect(setItemSpy).toHaveBeenCalledWith(CACHE_KEY, JSON.stringify(bunnyData));
    });
  });

  // -------------------------------------------------------------------------
  // ngOnInit() — cache hit
  // -------------------------------------------------------------------------
  describe('ngOnInit() with a fresh cache', () => {
    it('uses the cached bunny and skips the HTTP call when date matches today', () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const today = `${y}-${m}-${d}`;

      const cached = {
        date: today,
        imageUrl: 'https://example.com/cached.jpg',
        largeImageUrl: 'https://example.com/cached-large.jpg',
        photographer: 'cached-user',
        pageUrl: 'https://pixabay.com/photos/cached',
        tags: 'fluffy, bunny',
      };
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(cached));

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      // No HTTP request should have been made
      httpMock.expectNone(buildExpectedUrl());

      const component = fixture.componentInstance;
      expect(component.bunny).toEqual(cached);
      expect(component.loading).toBeFalse();
      expect(component.error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // ngOnInit() — stale cache triggers fetch
  // -------------------------------------------------------------------------
  describe('ngOnInit() with a stale cache', () => {
    it('calls fetchBunny when the cached date does not match today', () => {
      const stale = {
        date: '2000-01-01',
        imageUrl: 'https://example.com/old.jpg',
        largeImageUrl: 'https://example.com/old-large.jpg',
        photographer: 'old-user',
        pageUrl: 'https://pixabay.com/photos/old',
        tags: 'old bunny',
      };
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(stale));
      spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      // An HTTP request must have been issued
      const req = httpMock.expectOne(buildExpectedUrl());
      req.flush({ hits: [makeFakeHit()], totalHits: 1 });

      expect(fixture.componentInstance.loading).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // ngOnInit() — absent cache triggers fetch
  // -------------------------------------------------------------------------
  describe('ngOnInit() with no cache', () => {
    it('calls fetchBunny when cache is absent', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      const req = httpMock.expectOne(buildExpectedUrl());
      req.flush({ hits: [makeFakeHit()], totalHits: 1 });

      expect(fixture.componentInstance.loading).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // fetchBunny() — index selection
  // -------------------------------------------------------------------------
  describe('fetchBunny() index selection', () => {
    it('selects the hit at index dayOfYear % hits.length', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      // Build an array with 10 distinct hits so we can verify the index
      const hits = Array.from({ length: 10 }, (_, i) =>
        makeFakeHit({
          id: i,
          webformatURL: `https://example.com/web-${i}.jpg`,
          largeImageURL: `https://example.com/large-${i}.jpg`,
          user: `user-${i}`,
          pageURL: `https://pixabay.com/photos/${i}`,
          tags: `tag-${i}`,
        })
      );

      const req = httpMock.expectOne(buildExpectedUrl());
      req.flush({ hits, totalHits: hits.length });

      const dayOfYear = (component as any).getDayOfYear() as number;
      const expectedIndex = dayOfYear % hits.length;
      expect(component.bunny?.imageUrl).toBe(`https://example.com/web-${expectedIndex}.jpg`);
    });
  });

  // -------------------------------------------------------------------------
  // fetchBunny() — success path
  // -------------------------------------------------------------------------
  describe('fetchBunny() on success', () => {
    it('sets bunny, saves to cache, and clears loading flag', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      const setItemSpy = spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;

      expect(component.loading).toBeTrue();

      fixture.detectChanges();

      const req = httpMock.expectOne(buildExpectedUrl());
      const hit = makeFakeHit();
      req.flush({ hits: [hit], totalHits: 1 });

      expect(component.loading).toBeFalse();
      expect(component.error).toBeNull();
      expect(component.bunny).toBeTruthy();
      expect(component.bunny?.imageUrl).toBe(hit.webformatURL);
      expect(component.bunny?.largeImageUrl).toBe(hit.largeImageURL);
      expect(component.bunny?.photographer).toBe(hit.user);
      expect(component.bunny?.pageUrl).toBe(hit.pageURL);
      expect(component.bunny?.tags).toBe(hit.tags);
      expect(setItemSpy).toHaveBeenCalledWith(CACHE_KEY, jasmine.any(String));
    });
  });

  // -------------------------------------------------------------------------
  // fetchBunny() — empty hits array
  // -------------------------------------------------------------------------
  describe('fetchBunny() when API returns empty hits', () => {
    it('sets an error message and clears loading flag', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const req = httpMock.expectOne(buildExpectedUrl());
      req.flush({ hits: [], totalHits: 0 });

      expect(component.loading).toBeFalse();
      expect(component.bunny).toBeNull();
      expect(component.error).toBe('No bunnies found. Try again later!');
    });
  });

  // -------------------------------------------------------------------------
  // fetchBunny() — HTTP error
  // -------------------------------------------------------------------------
  describe('fetchBunny() when HTTP call fails', () => {
    it('sets an error message and clears loading flag', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      const req = httpMock.expectOne(buildExpectedUrl());
      req.error(new ProgressEvent('network error'));

      expect(component.loading).toBeFalse();
      expect(component.bunny).toBeNull();
      expect(component.error).toBe("Could not fetch today's bunny. Please try again later.");
    });
  });

  // -------------------------------------------------------------------------
  // loading flag lifecycle
  // -------------------------------------------------------------------------
  describe('loading flag lifecycle', () => {
    it('starts as true and becomes false after a successful fetch', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;

      // Before detectChanges (which triggers ngOnInit) loading is already true
      expect(component.loading).toBeTrue();

      fixture.detectChanges();

      // Still true while the request is in flight
      expect(component.loading).toBeTrue();

      httpMock.expectOne(buildExpectedUrl()).flush({ hits: [makeFakeHit()], totalHits: 1 });

      expect(component.loading).toBeFalse();
    });

    it('starts as true and becomes false after a failed fetch', () => {
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(localStorage, 'setItem');

      const fixture = TestBed.createComponent(AppComponent);
      const component = fixture.componentInstance;
      expect(component.loading).toBeTrue();

      fixture.detectChanges();

      httpMock.expectOne(buildExpectedUrl()).error(new ProgressEvent('network error'));

      expect(component.loading).toBeFalse();
    });
  });
});
