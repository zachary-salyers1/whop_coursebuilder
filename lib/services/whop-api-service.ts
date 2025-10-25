import { whopSdk } from '../whop-sdk';
import type { CourseStructure } from '../types/domain';

export class WhopAPIService {
  /**
   * Publish course to Whop
   * NOTE: Automatic course creation via API is not yet implemented.
   * Users will need to manually create courses in Whop dashboard using the generated structure.
   */
  static async publishCourse(companyId: string, structure: CourseStructure): Promise<string> {
    // TODO: Implement when Whop provides API endpoints for course/experience creation
    console.log('Publish course called for company:', companyId);
    console.log('Course structure:', JSON.stringify(structure, null, 2));

    throw new Error(
      'Automatic Whop course publishing is not yet implemented. ' +
      'Please create your course manually in the Whop dashboard using the generated structure. ' +
      'You can view the full course structure in the preview page.'
    );
  }
}
