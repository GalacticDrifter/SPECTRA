import { Routes } from '@angular/router';
import { WorkProductsFormComponent } from './work-products-form/work-products-form.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestResponseFormComponent } from './request-response-form/request-response-form.component';
import { ReqResGuard } from './guards/req-res.guard';
import { WorkProductsGuard } from './guards/work-products.guard';
import { ReportGuard } from './guards/report.guard';
import { ReportComponent } from './report/report.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: '',
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'work-products-form',
                component: WorkProductsFormComponent,
                canActivate: [WorkProductsGuard]
            },
            {
                path: 'request-response-form',
                component: RequestResponseFormComponent,
                canActivate: [ReqResGuard]
            },
            {
                path: 'report',
                component: ReportComponent,
                canActivate: [ReportGuard]
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
