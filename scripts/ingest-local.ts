import { runIngestion } from '../src/lib/ingest';

async function main() {
  console.log('🚀 Starting local ingestion run...');
  try {
    const result = await runIngestion();
    console.log('✅ Ingestion complete!');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

main();
