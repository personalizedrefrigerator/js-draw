import { BeforeDeallocCallback, PartialCacheState } from './types';
import CacheRecord from './CacheRecord';
import Rect2 from '../../geometry/Rect2';


export class CacheRecordManager {
	// Fixed-size array: Cache blocks are assigned indicies into [cachedCanvases].
	private cacheRecords: CacheRecord[] = [];
	private maxCanvases: number;

	public constructor(private readonly cacheState: PartialCacheState) {
		const cacheProps = cacheState.props;
		this.maxCanvases = Math.ceil(
			// Assuming four components per pixel:
			cacheProps.cacheSize / 4 / cacheProps.blockResolution.x / cacheProps.blockResolution.y
		);
	}

	public allocCanvas(drawTo: Rect2, onDealloc: BeforeDeallocCallback): CacheRecord {
		if (this.cacheRecords.length < this.maxCanvases) {
			const record: CacheRecord = new CacheRecord(
				onDealloc,
				{
					...this.cacheState,
					recordManager: this,
				},
			);
			record.setRenderingRegion(drawTo);
			this.cacheRecords.push(record);

			return record;
		} else {
			const lru = this.getLeastRecentlyUsedRecord()!;
			lru.realloc(onDealloc);
			lru.setRenderingRegion(drawTo);
			return lru;
		}
	}

	// Returns null if there are no cache records. Returns an unalloc'd record if one exists.
	private getLeastRecentlyUsedRecord(): CacheRecord|null {
		let lruSoFar: CacheRecord|null = null;
		for (const rec of this.cacheRecords) {
			if (!rec.isAllocd()) {
				return rec;
			}

			if (!lruSoFar || rec.getLastUsedCycle() < lruSoFar.getLastUsedCycle()) {
				lruSoFar = rec;
			}
		}

		return lruSoFar;
	}
}
