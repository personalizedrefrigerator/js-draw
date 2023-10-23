import { BeforeDeallocCallback, CacheProps, CacheState } from './types';
import CacheRecord from './CacheRecord';
import { Rect2 } from '@js-draw/math';

const debugMode = false;

export class CacheRecordManager {
	// Fixed-size array: Cache blocks are assigned indicies into [cachedCanvases].
	private cacheRecords: CacheRecord[] = [];
	private maxCanvases: number;
	private cacheState: CacheState;

	public constructor(cacheProps: CacheProps) {
		this.maxCanvases = Math.ceil(
			// Assuming four components per pixel:
			cacheProps.cacheSize / 4 / cacheProps.blockResolution.x / cacheProps.blockResolution.y
		);
	}

	public setSharedState(state: CacheState) {
		this.cacheState = state;
	}

	public allocCanvas(drawTo: Rect2, onDealloc: BeforeDeallocCallback): CacheRecord {
		if (this.cacheRecords.length < this.maxCanvases) {
			const record: CacheRecord = new CacheRecord(
				onDealloc,
				this.cacheState,
			);
			record.setRenderingRegion(drawTo);
			this.cacheRecords.push(record);

			if (debugMode) {
				console.log('[Cache] Cache spaces used: ', this.cacheRecords.length, ' of ', this.maxCanvases);
			}

			return record;
		} else {
			const lru = this.getLeastRecentlyUsedRecord()!;

			if (debugMode) {
				console.log(
					'[Cache] Re-alloc. Times allocated: ', lru.allocCount,
					'\nLast used cycle: ', lru.getLastUsedCycle(),
					'\nCurrent cycle: ', this.cacheState.currentRenderingCycle
				);
			}

			lru.realloc(onDealloc);
			lru.setRenderingRegion(drawTo);

			if (debugMode) {
				console.log(
					'[Cache] Now re-alloc\'d. Last used cycle: ', lru.getLastUsedCycle()
				);
				console.assert(
					lru['cacheState'] === this.cacheState,
					'[Cache] Unequal cache states! cacheState should be a shared object!'
				);
			}

			return lru;
		}
	}

	// Returns null if there are no cache records. Returns an unalloc'd record if one exists.
	private getLeastRecentlyUsedRecord(): CacheRecord|null {
		this.cacheRecords.sort((a, b) => a.getLastUsedCycle() - b.getLastUsedCycle());
		return this.cacheRecords[0];
	}

	// Returns information to (hopefully) help debug performance issues
	public getDebugInfo() {
		let numberAllocd = 0;
		let averageReassignedCount = 0;
		for (const cacheRecord of this.cacheRecords) {
			averageReassignedCount += cacheRecord.allocCount;

			if (cacheRecord.isAllocd()) {
				numberAllocd ++;
			}
		}
		averageReassignedCount /= Math.max(this.cacheRecords.length, 0);

		const debugInfo = [
			`${this.cacheRecords.length} cache records (max ${this.maxCanvases})`,
			`${numberAllocd} assigned to screen regions`,
			`Average number of times reassigned: ${Math.round(averageReassignedCount * 100) / 100}`,
		];

		return debugInfo.join('\n');
	}
}
