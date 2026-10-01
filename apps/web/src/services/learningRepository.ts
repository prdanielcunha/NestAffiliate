import { doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import type { LearningInsight } from '@nestaffiliate/learning';

export async function saveLearningInsights(
  db:Firestore,
  organizationId:string,
  insights:LearningInsight[],
){
  if(!insights.length) return;
  const batch=writeBatch(db);
  for(const insight of insights){
    batch.set(
      doc(db,'organizations',organizationId,'products','nestaffiliate','learningSignals',insight.id),
      {
        ...insight,
        organizationId,
        updatedAt:serverTimestamp(),
      },
      {merge:true},
    );
  }
  await batch.commit();
}
